<?php
/**
 * WhatsApp Automation Platform — WordPress/WooCommerce Plugin
 * Plugin Name: WhatsApp Automation
 * Description: Automated WhatsApp notifications for WooCommerce orders
 * Version: 1.0.0
 * Author: WhatsApp Platform
 */

if (!defined('ABSPATH')) exit;

define('WA_PLUGIN_VERSION', '1.0.0');
define('WA_API_URL', get_option('wa_api_url', 'https://api.yourplatform.com/v1'));

// ============================================================
// Admin Settings Page
// ============================================================

add_action('admin_menu', function () {
    add_menu_page(
        'WhatsApp Automation',
        'WA Automation',
        'manage_options',
        'wa-automation',
        'wa_settings_page',
        'dashicons-whatsapp',
        58
    );
});

function wa_settings_page() {
    if (isset($_POST['wa_save_settings'])) {
        update_option('wa_api_key', sanitize_text_field($_POST['wa_api_key']));
        update_option('wa_api_url', sanitize_text_field($_POST['wa_api_url']));
        update_option('wa_enable_order_confirmation', isset($_POST['wa_enable_order_confirmation']) ? '1' : '0');
        update_option('wa_enable_shipping', isset($_POST['wa_enable_shipping']) ? '1' : '0');
        update_option('wa_enable_abandoned_cart', isset($_POST['wa_enable_abandoned_cart']) ? '1' : '0');
        update_option('wa_enable_back_in_stock', isset($_POST['wa_enable_back_in_stock']) ? '1' : '0');
        update_option('wa_float_button', isset($_POST['wa_float_button']) ? '1' : '0');
        update_option('wa_float_phone', sanitize_text_field($_POST['wa_float_phone']));
        update_option('wa_float_message', sanitize_text_field($_POST['wa_float_message']));
        echo '<div class="notice notice-success"><p>Settings saved!</p></div>';
    }
    ?>
    <div class="wrap">
        <h1>WhatsApp Automation Settings</h1>
        <form method="post">
            <table class="form-table">
                <tr><th>API Key</th><td><input type="text" name="wa_api_key" value="<?php echo esc_attr(get_option('wa_api_key')); ?>" class="regular-text" /></td></tr>
                <tr><th>API URL</th><td><input type="text" name="wa_api_url" value="<?php echo esc_attr(get_option('wa_api_url', 'https://api.yourplatform.com/v1')); ?>" class="regular-text" /></td></tr>
                <tr><th>Order Confirmation</th><td><input type="checkbox" name="wa_enable_order_confirmation" <?php checked(get_option('wa_enable_order_confirmation'), '1'); ?> /></td></tr>
                <tr><th>Shipping Updates</th><td><input type="checkbox" name="wa_enable_shipping" <?php checked(get_option('wa_enable_shipping'), '1'); ?> /></td></tr>
                <tr><th>Abandoned Cart</th><td><input type="checkbox" name="wa_enable_abandoned_cart" <?php checked(get_option('wa_enable_abandoned_cart'), '1'); ?> /></td></tr>
                <tr><th>Back in Stock</th><td><input type="checkbox" name="wa_enable_back_in_stock" <?php checked(get_option('wa_enable_back_in_stock'), '1'); ?> /></td></tr>
                <tr><th colspan="2"><h2>Floating WhatsApp Button</h2></th></tr>
                <tr><th>Enable Button</th><td><input type="checkbox" name="wa_float_button" <?php checked(get_option('wa_float_button'), '1'); ?> /></td></tr>
                <tr><th>WhatsApp Phone</th><td><input type="text" name="wa_float_phone" value="<?php echo esc_attr(get_option('wa_float_phone')); ?>" placeholder="919876543210" class="regular-text" /></td></tr>
                <tr><th>Pre-filled Message</th><td><input type="text" name="wa_float_message" value="<?php echo esc_attr(get_option('wa_float_message', 'Hello! I need help.')); ?>" class="regular-text" /></td></tr>
            </table>
            <?php submit_button('Save Settings', 'primary', 'wa_save_settings'); ?>
        </form>
    </div>
    <?php
}

// ============================================================
// WooCommerce Hooks
// ============================================================

// Order confirmation
add_action('woocommerce_order_status_processing', function ($order_id) {
    if (get_option('wa_enable_order_confirmation') !== '1') return;
    $order = wc_get_order($order_id);
    $phone = $order->get_billing_phone();
    if (!$phone) return;

    $products = array_map(fn($item) => $item->get_name(), array_values($order->get_items()));

    wa_trigger_event('order-created', [
        'order_id' => $order->get_order_number(),
        'customer_phone' => wa_format_phone($phone),
        'customer_name' => $order->get_billing_first_name(),
        'products' => $products,
        'amount' => $order->get_total(),
    ]);
});

// Shipping / shipped
add_action('woocommerce_order_status_completed', function ($order_id) {
    if (get_option('wa_enable_shipping') !== '1') return;
    $order = wc_get_order($order_id);
    $phone = $order->get_billing_phone();
    if (!$phone) return;

    wa_trigger_event('order-delivered', [
        'order_id' => $order->get_order_number(),
        'customer_phone' => wa_format_phone($phone),
        'customer_name' => $order->get_billing_first_name(),
    ]);
});

// Order cancelled
add_action('woocommerce_order_status_cancelled', function ($order_id) {
    $order = wc_get_order($order_id);
    $phone = $order->get_billing_phone();
    if (!$phone) return;

    wa_trigger_event('order-cancelled', [
        'order_id' => $order->get_order_number(),
        'customer_phone' => wa_format_phone($phone),
        'reason' => 'Customer request',
    ]);
});

// Abandoned cart — schedule check on cart update
add_action('woocommerce_cart_updated', function () {
    if (get_option('wa_enable_abandoned_cart') !== '1') return;
    if (!is_user_logged_in()) return;

    $user = wp_get_current_user();
    $phone = get_user_meta($user->ID, 'billing_phone', true);
    if (!$phone) return;

    $cart = WC()->cart;
    if ($cart->is_empty()) return;

    // Store cart data for abandoned cart detection
    $cart_data = [
        'customer_phone' => wa_format_phone($phone),
        'customer_name' => $user->first_name,
        'cart_total' => $cart->get_cart_total(),
        'recovery_url' => wc_get_cart_url(),
        'timestamp' => time(),
    ];
    update_user_meta($user->ID, 'wa_cart_data', $cart_data);
    wp_schedule_single_event(time() + 3600, 'wa_check_abandoned_cart', [$user->ID]);
});

// Abandoned cart checker
add_action('wa_check_abandoned_cart', function ($user_id) {
    $cart_data = get_user_meta($user_id, 'wa_cart_data', true);
    if (!$cart_data) return;
    // Only send if cart is still abandoned (not purchased)
    $orders = wc_get_orders(['customer' => $user_id, 'date_created' => '>' . date('Y-m-d H:i:s', $cart_data['timestamp']), 'limit' => 1]);
    if (!empty($orders)) return;
    wa_trigger_event('cart-abandoned', $cart_data);
    delete_user_meta($user_id, 'wa_cart_data');
});

// Back in stock
add_action('woocommerce_product_set_stock', function ($product) {
    if (get_option('wa_enable_back_in_stock') !== '1') return;
    if ($product->get_stock_quantity() <= 0) return;

    $waitlist = get_post_meta($product->get_id(), 'wa_back_in_stock_waitlist', true) ?: [];
    foreach ($waitlist as $phone) {
        wa_trigger_event('back-in-stock', [
            'product_id' => $product->get_id(),
            'product_name' => $product->get_name(),
            'product_url' => get_permalink($product->get_id()),
            'notify_phones' => [$phone],
        ]);
    }
    delete_post_meta($product->get_id(), 'wa_back_in_stock_waitlist');
});

// ============================================================
// Floating WhatsApp Button
// ============================================================

add_action('wp_footer', function () {
    if (get_option('wa_float_button') !== '1') return;
    $phone = get_option('wa_float_phone');
    $msg = urlencode(get_option('wa_float_message', 'Hello!'));
    if (!$phone) return;
    echo <<<HTML
    <a href="https://wa.me/{$phone}?text={$msg}" target="_blank" id="wa-float-btn"
       style="position:fixed;bottom:24px;right:24px;background:#25D366;color:#fff;
              border-radius:50px;padding:14px 20px;font-size:16px;text-decoration:none;
              display:flex;align-items:center;gap:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);
              z-index:9999;font-family:sans-serif;font-weight:600;">
      <svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967..."/></svg>
      Chat on WhatsApp
    </a>
    HTML;
});

// ============================================================
// Helper Functions
// ============================================================

function wa_trigger_event(string $event, array $data): void {
    $api_key = get_option('wa_api_key');
    $api_url = get_option('wa_api_url', 'https://api.yourplatform.com/v1');
    if (!$api_key) return;

    wp_remote_post("{$api_url}/event/{$event}", [
        'method' => 'POST',
        'timeout' => 10,
        'headers' => [
            'Content-Type' => 'application/json',
            'x-api-key' => $api_key,
        ],
        'body' => wp_json_encode($data),
    ]);
}

function wa_format_phone(string $phone): string {
    // Remove non-digits
    $phone = preg_replace('/\D/', '', $phone);
    // Add country code if missing (India default)
    if (strlen($phone) === 10) $phone = '91' . $phone;
    return $phone;
}

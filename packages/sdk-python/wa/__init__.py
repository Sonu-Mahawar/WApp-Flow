"""
WhatsApp Automation Platform - Python SDK
pip install whatsapp-automation
"""

import json
import urllib.request
import urllib.error
from typing import Optional, List, Dict, Any


class WAClient:
    """WhatsApp Automation Platform Python SDK"""

    def __init__(self):
        self.api_key: Optional[str] = None
        self.base_url: str = "https://api.yourplatform.com/v1"

    def init(self, api_key: str, base_url: str = "https://api.yourplatform.com/v1") -> "WAClient":
        """Initialize the SDK with API key and base URL"""
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        return self

    def _request(self, method: str, path: str, body: Optional[Dict] = None) -> Dict:
        url = f"{self.base_url}{path}"
        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
        }
        data = json.dumps(body).encode("utf-8") if body else None
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read().decode("utf-8"))
                if not result.get("success"):
                    raise Exception(result.get("error", "API request failed"))
                return result
        except urllib.error.HTTPError as e:
            error_body = json.loads(e.read().decode("utf-8"))
            raise Exception(error_body.get("error", f"HTTP {e.code}"))

    # ============================================================
    # Messaging
    # ============================================================

    def send_message(self, phone: str, message: str) -> Dict:
        """Send a plain text WhatsApp message"""
        return self._request("POST", "/messages/send", {"phone": phone, "message": message})

    def send_template(self, phone: str, template: str, variables: Dict = None, language: str = "en") -> Dict:
        """Send a template message"""
        return self._request("POST", "/messages/send-template", {
            "phone": phone, "template": template,
            "variables": variables or {}, "language": language,
        })

    def send_media(self, phone: str, media_url: str, media_type: str, caption: str = "") -> Dict:
        """Send an image, video, or document"""
        return self._request("POST", "/messages/send-media", {
            "phone": phone, "mediaUrl": media_url,
            "mediaType": media_type, "caption": caption,
        })

    def send_bulk(self, recipients: List[Dict], template: str = None, message: str = None) -> Dict:
        """Send bulk messages to a list of recipients"""
        return self._request("POST", "/messages/send-bulk", {
            "recipients": recipients, "template": template, "message": message,
        })

    # ============================================================
    # Events
    # ============================================================

    def order_created(self, order_id, customer_phone: str, customer_name: str = None,
                      products: List[str] = None, amount: str = None) -> Dict:
        """Trigger order created automation"""
        return self._request("POST", "/event/order-created", {
            "order_id": str(order_id), "customer_phone": customer_phone,
            "customer_name": customer_name, "products": products or [], "amount": amount,
        })

    def cart_abandoned(self, customer_phone: str, customer_name: str = None,
                       cart_total: str = None, recovery_url: str = None) -> Dict:
        """Trigger abandoned cart automation"""
        return self._request("POST", "/event/cart-abandoned", {
            "customer_phone": customer_phone, "customer_name": customer_name,
            "cart_total": cart_total, "recovery_url": recovery_url,
        })

    def order_shipped(self, order_id, customer_phone: str,
                      tracking_number: str = None, courier: str = None) -> Dict:
        """Trigger order shipped automation"""
        return self._request("POST", "/event/order-shipped", {
            "order_id": str(order_id), "customer_phone": customer_phone,
            "tracking_number": tracking_number, "courier": courier,
        })

    def order_delivered(self, order_id, customer_phone: str, customer_name: str = None) -> Dict:
        """Trigger order delivered automation"""
        return self._request("POST", "/event/order-delivered", {
            "order_id": str(order_id), "customer_phone": customer_phone, "customer_name": customer_name,
        })

    def order_cancelled(self, order_id, customer_phone: str, reason: str = None) -> Dict:
        """Trigger order cancelled automation"""
        return self._request("POST", "/event/order-cancelled", {
            "order_id": str(order_id), "customer_phone": customer_phone, "reason": reason,
        })

    def trigger(self, event_name: str, phone: str, data: Dict = None) -> Dict:
        """Trigger a custom event"""
        return self._request("POST", "/event/custom", {
            "event_name": event_name, "phone": phone, "data": data or {},
        })

    # ============================================================
    # Contacts
    # ============================================================

    def create_contact(self, phone: str, name: str = None, email: str = None, tags: List[str] = None) -> Dict:
        """Create or update a contact"""
        return self._request("POST", "/contacts", {
            "phone": phone, "name": name, "email": email, "tags": tags or [],
        })

    def get_contacts(self, page: int = 1, limit: int = 50, search: str = None) -> Dict:
        """Get contacts list"""
        params = f"?page={page}&limit={limit}"
        if search: params += f"&search={search}"
        return self._request("GET", f"/contacts{params}")

    def import_contacts(self, contacts: List[Dict]) -> Dict:
        """Bulk import contacts from a list"""
        return self._request("POST", "/contacts/import", {"contacts": contacts})

    # ============================================================
    # Analytics
    # ============================================================

    def get_analytics(self, days: int = 30) -> Dict:
        """Get analytics overview"""
        return self._request("GET", f"/analytics/overview?days={days}")


# Default singleton client
_client = WAClient()


def init(api_key: str, base_url: str = "https://api.yourplatform.com/v1"):
    """Initialize the global client"""
    return _client.init(api_key, base_url)


def send_message(phone: str, message: str) -> Dict:
    return _client.send_message(phone, message)


def send_template(phone: str, template: str, variables: Dict = None, language: str = "en") -> Dict:
    return _client.send_template(phone, template, variables, language)


def order_created(order_id, customer_phone: str, **kwargs) -> Dict:
    return _client.order_created(order_id, customer_phone, **kwargs)


def cart_abandoned(customer_phone: str, **kwargs) -> Dict:
    return _client.cart_abandoned(customer_phone, **kwargs)


def order_shipped(order_id, customer_phone: str, **kwargs) -> Dict:
    return _client.order_shipped(order_id, customer_phone, **kwargs)


def trigger(event_name: str, phone: str, data: Dict = None) -> Dict:
    return _client.trigger(event_name, phone, data)


def create_contact(phone: str, **kwargs) -> Dict:
    return _client.create_contact(phone, **kwargs)


def get_analytics(days: int = 30) -> Dict:
    return _client.get_analytics(days)

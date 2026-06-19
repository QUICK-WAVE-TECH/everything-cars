import json
import logging
import traceback
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger("notifications")


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user or self.user.is_anonymous:
            logger.warning("[WS] Rejected anonymous connection")
            await self.close()
            return

        self.group_name = f"user_{self.user.id}"
        try:
            await self.channel_layer.group_add(
                self.group_name, self.channel_name
            )
        except Exception as e:
            logger.error("[WS] group_add failed: %s", e)
            await self.close()
            return

        await self.accept()
        logger.info("[WS] Connected: %s (%s)", self.user.email, self.group_name)

    async def disconnect(self, close_code):
        user_email = getattr(self.user, "email", "unknown") if hasattr(self, "user") else "unknown"
        if hasattr(self, "group_name"):
            try:
                await self.channel_layer.group_discard(
                    self.group_name, self.channel_name
                )
            except Exception as e:
                logger.error("[WS] group_discard failed: %s", e)
        logger.info("[WS] Disconnected: %s (code: %s)", user_email, close_code)

    async def receive(self, text_data=None, bytes_data=None):
        if text_data == "ping":
            await self.send(text_data="pong")

    async def notification_send(self, event):
        """Handler for group_send with type 'notification.send'"""
        try:
            logger.info("[WS] Delivering to %s: %s", self.user.email, event["payload"].get("title", ""))
            await self.send(text_data=json.dumps(event["payload"]))
        except Exception as e:
            logger.error("[WS] Send failed: %s\n%s", e, traceback.format_exc())

    async def websocket_disconnect(self, message):
        """Override to log why Daphne is disconnecting us."""
        logger.info("[WS] websocket_disconnect event received for %s: %s",
                     getattr(self, "group_name", "unknown"), message)
        await super().websocket_disconnect(message)

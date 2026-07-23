from django.db import transaction


def schedule_notification(notify_func, get_payload):
    """Fire a notification only once the surrounding transaction commits."""
    transaction.on_commit(lambda: notify_func(get_payload()), robust=True)

import re

from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

MAX_PASSWORD_LENGTH = 128

# Kept in sync with the frontend PASSWORD_HINT label.
PASSWORD_HELP_TEXT = _(
    "Must be at least 8 characters, including an uppercase letter, a lowercase "
    "letter, and a number or symbol."
)


class PasswordComplexityValidator:
    """Requires an uppercase letter, a lowercase letter, and a number or symbol,
    and caps the length. Minimum length is handled by Django's
    MinimumLengthValidator so the two rules don't emit duplicate messages."""

    def validate(self, password, user=None):
        errors = []
        if len(password) > MAX_PASSWORD_LENGTH:
            errors.append(
                ValidationError(
                    _("Password must be %(max)d characters or fewer.")
                    % {"max": MAX_PASSWORD_LENGTH},
                    code="password_too_long",
                )
            )
        if not re.search(r"[A-Z]", password):
            errors.append(
                ValidationError(
                    _("Password must include at least one uppercase letter."),
                    code="password_no_upper",
                )
            )
        if not re.search(r"[a-z]", password):
            errors.append(
                ValidationError(
                    _("Password must include at least one lowercase letter."),
                    code="password_no_lower",
                )
            )
        # A number or any non-alphanumeric symbol (underscore counts as a symbol).
        if not re.search(r"[\d\W_]", password):
            errors.append(
                ValidationError(
                    _("Password must include at least one number or symbol."),
                    code="password_no_number_or_symbol",
                )
            )
        if errors:
            raise ValidationError(errors)

    def get_help_text(self):
        return PASSWORD_HELP_TEXT

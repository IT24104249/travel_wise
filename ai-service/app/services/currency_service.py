from __future__ import annotations
import logging
from typing import Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Standard exchange rates relative to LKR (Sri Lankan Rupee)
# Baseline rates: 1 USD ~ 308 LKR, 1 EUR ~ 335 LKR, 1 GBP ~ 398 LKR, 1 AUD ~ 205 LKR
RATES_TO_LKR: dict[str, float] = {
    "LKR": 1.0,
    "USD": 308.50,
    "EUR": 335.20,
    "GBP": 398.80,
    "AUD": 204.60,
    "SGD": 234.10,
    "INR": 3.70,
}

def convert_amount(amount: float, from_curr: str, to_curr: str) -> dict[str, Any]:
    """Convert an amount from one currency to another using exchange rates."""
    from_c = from_curr.upper().strip()
    to_c = to_curr.upper().strip()

    rate_from_to_lkr = RATES_TO_LKR.get(from_c, 1.0)
    rate_to_to_lkr = RATES_TO_LKR.get(to_c, 1.0)

    # Convert to LKR base first, then to target currency
    amount_in_lkr = amount * rate_from_to_lkr
    converted = amount_in_lkr / rate_to_to_lkr if rate_to_to_lkr > 0 else amount

    exchange_rate = rate_from_to_lkr / rate_to_to_lkr if rate_to_to_lkr > 0 else 1.0

    return {
        "original_amount": round(amount, 2),
        "from_currency": from_c,
        "converted_amount": round(converted, 2),
        "to_currency": to_c,
        "exchange_rate": round(exchange_rate, 4),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "TravelWise-FX-Engine"
    }

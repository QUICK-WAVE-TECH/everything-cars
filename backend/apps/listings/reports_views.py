"""Admin sales-performance report — platform-wide aggregation over completed
purchase/rental transactions. Staff only."""

from collections import OrderedDict
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsStaff

from .models import (
    Branch,
    Request,
    Transaction,
    TransactionStatus,
    TransactionType,
)

RANGE_DAYS = {"7d": 7, "30d": 30, "3m": 90, "12m": 365}
DEFAULT_RANGE = "3m"


def _f(value):
    """Decimal/None → float for JSON."""
    return float(value) if value is not None else 0.0


def _resolve_window(params):
    """(from_date, to_date, label) from ?range or ?from&?to. Inclusive dates."""
    today = timezone.localdate()
    from_raw, to_raw = params.get("from"), params.get("to")
    if from_raw and to_raw:
        start, end = parse_date(from_raw), parse_date(to_raw)
        if start and end and start <= end:
            return start, end, "Custom range"
    range_key = params.get("range", DEFAULT_RANGE)
    days = RANGE_DAYS.get(range_key, RANGE_DAYS[DEFAULT_RANGE])
    start = today - timedelta(days=days - 1)
    labels = {
        "7d": "Last 7 days",
        "30d": "Last 30 days",
        "3m": "Last 3 months",
        "12m": "Last 12 months",
    }
    return start, today, labels.get(range_key, "Last 3 months")


def _sale_txns(start, end, type_filter, branch):
    types = {
        "buy": [TransactionType.PURCHASE],
        "rent": [TransactionType.RENTAL],
    }.get(type_filter, [TransactionType.PURCHASE, TransactionType.RENTAL])
    qs = (
        Transaction.objects.filter(
            status=TransactionStatus.COMPLETED,
            transaction_type__in=types,
            created_at__date__gte=start,
            created_at__date__lte=end,
        )
        .select_related("request", "request__car", "request__car__branch")
    )
    if branch:
        qs = qs.filter(request__car__branch_id=branch)
    return qs


def _summarize(txns):
    """KPI scalars from a transaction iterable."""
    revenue = purchase_total = Decimal("0")
    purchase_units = rental_units = 0
    for t in txns:
        revenue += t.amount
        if t.transaction_type == TransactionType.PURCHASE:
            purchase_units += 1
            purchase_total += t.amount
        else:
            rental_units += 1
    avg_sale = purchase_total / purchase_units if purchase_units else Decimal("0")
    return {
        "revenue": revenue,
        "purchase_units": purchase_units,
        "rental_units": rental_units,
        "avg_sale_price": avg_sale,
        "purchase_total": purchase_total,
    }


def _pct_delta(cur, prev):
    if not prev:
        return None
    return round((float(cur) - float(prev)) / float(prev) * 100, 1)


def _month_label(d):
    return d.strftime("%b %Y")


class SalesReportView(APIView):
    """GET /api/v1/listings/admin/reports/sales?range=&from=&to=&type=&branch="""

    permission_classes = [IsAuthenticated, IsStaff]

    def get(self, request):
        p = request.query_params
        start, end, range_label = _resolve_window(p)
        type_filter = p.get("type", "all")
        branch = p.get("branch") or None

        txns = list(_sale_txns(start, end, type_filter, branch))

        # Previous equal-length window for deltas.
        span = (end - start).days + 1
        prev_end = start - timedelta(days=1)
        prev_start = prev_end - timedelta(days=span - 1)
        prev = _summarize(_sale_txns(prev_start, prev_end, type_filter, branch))
        cur = _summarize(txns)

        # Conversion: completed purchases ÷ distinct cars that drew a buy request
        # in the window.
        leads = (
            Request.objects.filter(
                request_type="buy",
                created_at__date__gte=start,
                created_at__date__lte=end,
            )
            .values("car_id")
            .distinct()
            .count()
        )
        conversion = (cur["purchase_units"] / leads * 100) if leads else 0.0
        prev_leads = (
            Request.objects.filter(
                request_type="buy",
                created_at__date__gte=prev_start,
                created_at__date__lte=prev_end,
            )
            .values("car_id")
            .distinct()
            .count()
        )
        prev_conv = (prev["purchase_units"] / prev_leads * 100) if prev_leads else 0.0

        return Response(
            {
                "range": {
                    "from": start.isoformat(),
                    "to": end.isoformat(),
                    "label": range_label,
                },
                "kpis": {
                    "total_revenue": _f(cur["revenue"]),
                    "units_sold": cur["purchase_units"],
                    "avg_sale_price": _f(cur["avg_sale_price"]),
                    "conversion_rate": round(conversion, 1),
                    "deltas": {
                        "total_revenue": _pct_delta(cur["revenue"], prev["revenue"]),
                        "units_sold": _pct_delta(
                            cur["purchase_units"], prev["purchase_units"]
                        ),
                        "avg_sale_price": _pct_delta(
                            cur["avg_sale_price"], prev["avg_sale_price"]
                        ),
                        "conversion_rate": _pct_delta(conversion, prev_conv),
                    },
                },
                "revenue_series": self._revenue_series(txns, start, end),
                "by_period": self._by_period(txns),
                "revenue_mix": [
                    {"category": "Purchases", "value": _f(cur["purchase_total"])},
                    {
                        "category": "Rentals",
                        "value": _f(cur["revenue"] - cur["purchase_total"]),
                    },
                ],
                "top_models": self._top_models(txns),
                "avg_price_series": self._avg_price_series(txns),
                "by_branch": self._by_branch(txns),
                "target": self._target(cur["revenue"], prev["revenue"]),
                "branches": [
                    {"id": str(b.id), "label": f"{b.name} · {b.state}"}
                    for b in Branch.objects.filter(is_active=True).order_by("name")
                ],
            }
        )

    def _revenue_series(self, txns, start, end):
        # Daily buckets, zero-filled so the area chart has a continuous axis.
        buckets = OrderedDict()
        day = start
        while day <= end:
            buckets[day.isoformat()] = {"purchases": 0.0, "rentals": 0.0}
            day += timedelta(days=1)
        for t in txns:
            key = t.created_at.date().isoformat()
            if key not in buckets:
                continue
            side = (
                "purchases"
                if t.transaction_type == TransactionType.PURCHASE
                else "rentals"
            )
            buckets[key][side] += float(t.amount)
        return [{"date": k, **v} for k, v in buckets.items()]

    def _by_period(self, txns):
        buckets = OrderedDict()
        for t in sorted(txns, key=lambda x: x.created_at):
            key = _month_label(t.created_at.date())
            row = buckets.setdefault(key, {"label": key, "units": 0, "revenue": 0.0})
            row["revenue"] += float(t.amount)
            if t.transaction_type == TransactionType.PURCHASE:
                row["units"] += 1
        return list(buckets.values())

    def _top_models(self, txns):
        totals = {}
        for t in txns:
            car = getattr(t.request, "car", None)
            if not car:
                continue
            brand = car.brand.name if car.brand_id else (car.brand_other or "")
            label = f"{brand} {car.model}".strip() or car.title
            totals[label] = totals.get(label, 0.0) + float(t.amount)
        rows = [{"label": k, "revenue": v} for k, v in totals.items()]
        rows.sort(key=lambda r: r["revenue"], reverse=True)
        return rows[:8]

    def _avg_price_series(self, txns):
        buckets = OrderedDict()
        for t in sorted(txns, key=lambda x: x.created_at):
            key = _month_label(t.created_at.date())
            row = buckets.setdefault(
                key,
                {"label": key, "_p_sum": 0.0, "_p_n": 0, "_r_rate_sum": 0.0, "_r_n": 0},
            )
            if t.transaction_type == TransactionType.PURCHASE:
                row["_p_sum"] += float(t.amount)
                row["_p_n"] += 1
            else:
                days = getattr(t.request, "duration_days", None) or 0
                if days > 0:
                    row["_r_rate_sum"] += float(t.amount) / days
                    row["_r_n"] += 1
        out = []
        for row in buckets.values():
            out.append(
                {
                    "label": row["label"],
                    "avg_sale_price": (
                        row["_p_sum"] / row["_p_n"] if row["_p_n"] else 0.0
                    ),
                    "avg_rent_per_day": (
                        row["_r_rate_sum"] / row["_r_n"] if row["_r_n"] else 0.0
                    ),
                }
            )
        return out

    def _by_branch(self, txns):
        buckets = {}
        for t in txns:
            car = getattr(t.request, "car", None)
            branch = getattr(car, "branch", None)
            name = branch.name if branch else "Individual / no branch"
            row = buckets.setdefault(name, {"branch": name, "revenue": 0.0, "units": 0})
            row["revenue"] += float(t.amount)
            if t.transaction_type == TransactionType.PURCHASE:
                row["units"] += 1
        rows = list(buckets.values())
        rows.sort(key=lambda r: r["revenue"], reverse=True)
        return rows

    def _target(self, revenue, prev_revenue):
        # No target model yet — the goal is beating the previous period.
        target = prev_revenue if prev_revenue else revenue
        pct = (float(revenue) / float(target) * 100) if target else 0.0
        return {
            "revenue": _f(revenue),
            "target": _f(target),
            "pct": round(pct, 1),
            "met": float(revenue) >= float(target) and float(target) > 0,
        }

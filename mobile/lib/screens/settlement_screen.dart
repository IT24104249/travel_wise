import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class SettlementScreen extends StatefulWidget {
  final String? initialTripId;
  const SettlementScreen({this.initialTripId, super.key});

  @override
  State<SettlementScreen> createState() => _SettlementScreenState();
}

class _SettlementScreenState extends State<SettlementScreen> {
  final api = ApiService();

  List<dynamic> trips = [];
  String? selectedTripId;
  Map<String, dynamic>? settlementData;
  bool loading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    _loadTrips();
  }

  Future<void> _loadTrips() async {
    setState(() => loading = true);
    try {
      final res = await api.getTrips();
      trips = res;
      if (trips.isNotEmpty) {
        selectedTripId = widget.initialTripId ?? trips.first['id'].toString();
        await _loadSettlement(selectedTripId!);
      } else {
        setState(() => loading = false);
      }
    } catch (e) {
      setState(() {
        error = e.toString().replaceFirst("Exception: ", "");
        loading = false;
      });
    }
  }

  Future<void> _loadSettlement(String tripId) async {
    setState(() {
      loading = true;
      error = null;
      selectedTripId = tripId;
    });

    try {
      final res = await api.getSettlement(tripId);
      setState(() {
        settlementData = res;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = e.toString().replaceFirst("Exception: ", "");
        loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text("Group Debt Settlement"),
        backgroundColor: AppTheme.cardBackground,
        elevation: 0,
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : trips.isEmpty
              ? _buildNoTripsState()
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 1. TRIP SELECTOR
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.cardBackground,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.white.withOpacity(0.08)),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            isExpanded: true,
                            value: selectedTripId,
                            dropdownColor: AppTheme.cardBackground,
                            items: trips.map((t) {
                              return DropdownMenuItem<String>(
                                value: t['id'].toString(),
                                child: Text(
                                  "${t['name']} (${t['destination']})",
                                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                                ),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) _loadSettlement(val);
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      if (error != null)
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.red.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(error!, style: const TextStyle(color: Colors.red)),
                        )
                      else ...[
                        // 2. SUMMARY METRICS
                        _buildSummaryMetrics(),

                        const SizedBox(height: 24),

                        // 3. MEMBER BALANCES BREAKDOWN
                        _buildMemberBalances(),

                        const SizedBox(height: 24),

                        // 4. RECOMMENDED SETTLEMENT TRANSFERS (MINIMUM CASH FLOW)
                        _buildSettlementTransfers(),
                      ],

                      const SizedBox(height: 32),
                    ],
                  ),
                ),
    );
  }

  Widget _buildNoTripsState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: const [
          Icon(Icons.luggage_outlined, size: 48, color: AppTheme.textSecondary),
          SizedBox(height: 12),
          Text(
            "No Group Trips Found",
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          SizedBox(height: 6),
          Text(
            "Create a group trip to start tracking shared expenses and debts.",
            style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryMetrics() {
    final transfers = (settlementData?['transfers'] as List?) ?? [];
    final balances = (settlementData?['balances'] as Map<String, dynamic>?) ?? {};
    final memberCount = balances.length;

    return Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.cardBackground,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.white.withOpacity(0.06)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Optimal Transfers", style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                const SizedBox(height: 4),
                Text(
                  "${transfers.length}",
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFFF59E0B)),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.cardBackground,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.white.withOpacity(0.06)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Group Members", style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                const SizedBox(height: 4),
                Text(
                  "$memberCount",
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppTheme.primary),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMemberBalances() {
    final balances = (settlementData?['balances'] as Map<String, dynamic>?) ?? {};

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          "Member Net Balances",
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white),
        ),
        const SizedBox(height: 10),
        if (balances.isEmpty)
          const Text("No expense records for this trip.", style: TextStyle(fontSize: 12, color: AppTheme.textSecondary))
        else
          ...balances.entries.map((entry) {
            final val = (entry.value as num).toDouble();
            final isCreditor = val > 0.005;
            final isDebtor = val < -0.005;
            final color = isCreditor ? const Color(0xFF22C55E) : isDebtor ? const Color(0xFFEF4444) : Colors.white60;

            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: AppTheme.cardBackground,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.06)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 14,
                        backgroundColor: color.withOpacity(0.2),
                        child: Text(
                          entry.key.isNotEmpty ? entry.key[0].toUpperCase() : "?",
                          style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 11),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(entry.key, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Colors.white)),
                    ],
                  ),
                  Text(
                    isCreditor
                        ? "+LKR ${val.toStringAsFixed(2)}"
                        : isDebtor
                            ? "-LKR ${(-val).toStringAsFixed(2)}"
                            : "Settled (LKR 0.00)",
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: color),
                  ),
                ],
              ),
            );
          }).toList(),
      ],
    );
  }

  Widget _buildSettlementTransfers() {
    final transfers = (settlementData?['transfers'] as List?) ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: const [
            Text(
              "Optimal Debt Settlements",
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white),
            ),
            Text(
              "Greedy Min-Cash-Flow",
              style: TextStyle(fontSize: 10, color: AppTheme.textSecondary),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (transfers.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF22C55E).withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF22C55E).withOpacity(0.3)),
            ),
            child: Row(
              children: const [
                Icon(Icons.check_circle_outline, color: Color(0xFF22C55E)),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    "All debts are fully settled! No payments required.",
                    style: TextStyle(color: Color(0xFF22C55E), fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          )
        else
          ...transfers.map((t) {
            final from = t['fromMember'] ?? 'Unknown';
            final to = t['toMember'] ?? 'Unknown';
            final amount = (t['amount'] as num?)?.toDouble() ?? 0.0;
            final currency = t['currency'] ?? 'LKR';

            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.cardBackground,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B).withOpacity(0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.swap_horiz, color: Color(0xFFF59E0B), size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        RichText(
                          text: TextSpan(
                            style: const TextStyle(fontSize: 13, color: Colors.white),
                            children: [
                              TextSpan(text: "$from ", style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFEF4444))),
                              const TextSpan(text: "pays "),
                              TextSpan(text: "$to", style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF22C55E))),
                            ],
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text("Minimum split settlement transfer", style: TextStyle(fontSize: 10.5, color: AppTheme.textSecondary)),
                      ],
                    ),
                  ),
                  Text(
                    "$currency ${amount.toStringAsFixed(2)}",
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                      color: Color(0xFFF59E0B),
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
      ],
    );
  }
}

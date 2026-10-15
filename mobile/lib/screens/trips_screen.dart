import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'trip_detail_screen.dart';
import 'trip_wizard_dialog.dart';

class TripsScreen extends StatefulWidget {
  final String? initialDestination;
  final String? initialTripName;

  const TripsScreen({this.initialDestination, this.initialTripName, super.key});

  @override
  State<TripsScreen> createState() => TripsScreenState();
}

class TripsScreenState extends State<TripsScreen> {
  final api = ApiService();
  List<dynamic> trips = [];
  bool loading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    loadTrips();
    if (widget.initialDestination != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        showCreateTripDialog(
          destination: widget.initialDestination,
          name: widget.initialTripName,
        );
      });
    }
  }

  Future<void> loadTrips() async {
    setState(() => loading = true);
    try {
      final res = await api.getTrips();
      setState(() {
        trips = res;
        error = null;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = e.toString().replaceFirst('Exception: ', '');
        loading = false;
      });
    }
  }

  Future<void> showCreateTripDialog({String? destination, String? name}) async {
    final ok = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (_) => TripWizardDialog(
        initialDestination: destination,
        initialName: name,
      ),
    );

    if (ok == true) loadTrips();
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: const [
            Icon(Icons.luggage, color: AppTheme.primary),
            SizedBox(width: 8),
            Text("My Travel Itineraries"),
          ],
        ),
        actions: [
          IconButton(onPressed: loadTrips, icon: const Icon(Icons.refresh)),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        onPressed: () => showCreateTripDialog(),
        icon: const Icon(Icons.add),
        label: const Text("New Trip"),
      ),
      body: RefreshIndicator(
        onRefresh: loadTrips,
        child: loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (error != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(error!, style: const TextStyle(color: AppTheme.danger)),
                    ),

                  if (trips.isEmpty && error == null)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 60),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.beach_access, size: 70, color: Colors.teal.shade200),
                          const SizedBox(height: 16),
                          const Text(
                            "No trips yet!",
                            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            "Tap 'New Trip' or browse 'Explore' to launch your first Sri Lankan adventure.",
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppTheme.textMuted),
                          ),
                        ],
                      ),
                    ),

                  ...trips.map((trip) {
                    final name = trip['name']?.toString() ?? 'Trip';
                    final dest = trip['destination']?.toString() ?? 'Sri Lanka';
                    final sDate = trip['startDate']?.toString() ?? '';
                    final eDate = trip['endDate']?.toString() ?? '';

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => TripDetailScreen(trip: trip as Map<String, dynamic>),
                            ),
                          );
                          loadTrips();
                        },
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  CircleAvatar(
                                    backgroundColor: AppTheme.primary.withOpacity(0.15),
                                    child: const Icon(Icons.card_travel, color: AppTheme.primary),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          name,
                                          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                                        ),
                                        const SizedBox(height: 2),
                                        Row(
                                          children: [
                                            const Icon(Icons.place, size: 14, color: AppTheme.textMuted),
                                            const SizedBox(width: 4),
                                            Text(dest, style: const TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline, size: 20, color: Colors.white38),
                                    onPressed: () async {
                                      final confirm = await showDialog<bool>(
                                        context: context,
                                        builder: (ctx) => AlertDialog(
                                          title: const Text("Delete Trip?"),
                                          content: Text("Are you sure you want to delete '$name'?"),
                                          actions: [
                                            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text("Cancel")),
                                            FilledButton(
                                              style: FilledButton.styleFrom(backgroundColor: Colors.red),
                                              onPressed: () => Navigator.pop(ctx, true),
                                              child: const Text("Delete"),
                                            ),
                                          ],
                                        ),
                                      );
                                      if (confirm == true) {
                                        try {
                                          await api.deleteTrip(trip['id'].toString());
                                          loadTrips();
                                        } catch (e) {
                                          if (mounted) {
                                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                                          }
                                        }
                                      }
                                    },
                                  ),
                                  const Icon(Icons.chevron_right, color: AppTheme.textMuted),
                                ],
                              ),
                              const Divider(height: 24),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.date_range, size: 14, color: AppTheme.primary),
                                      const SizedBox(width: 4),
                                      Text(
                                        "$sDate → $eDate",
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                      ),
                                    ],
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFECFDF5),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: const Text(
                                      "Active",
                                      style: TextStyle(color: Color(0xFF059669), fontSize: 11, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                ],
              ),
      ),
    );
  }
}

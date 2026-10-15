import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class TripWizardDialog extends StatefulWidget {
  final String? initialDestination;
  final String? initialName;

  const TripWizardDialog({
    this.initialDestination,
    this.initialName,
    super.key,
  });

  @override
  State<TripWizardDialog> createState() => _TripWizardDialogState();
}

class _TripWizardDialogState extends State<TripWizardDialog> {
  final api = ApiService();

  int currentStep = 0;
  bool isSubmitting = false;
  String? error;

  // Step 1: Core Details
  late TextEditingController nameCtrl;
  late TextEditingController destCtrl;
  final TextEditingController startLocCtrl = TextEditingController(text: "Colombo");
  DateTime startDate = DateTime.now().add(const Duration(days: 1));
  DateTime endDate = DateTime.now().add(const Duration(days: 4));

  // Step 2: Trip Mode & Group Members
  String tripMode = "GROUP"; // "SOLO" or "GROUP"
  final TextEditingController memberCtrl = TextEditingController();
  List<String> groupMembers = [];

  // Step 3: Travel Method
  String travelMethod = "PRIVATE_VEHICLE"; // "PRIVATE_VEHICLE", "RENTAL_VEHICLE", "PUBLIC_TRANSPORT"
  String vehicleType = "Car";

  // Step 4: Budget & Preferences
  final TextEditingController budgetCtrl = TextEditingController(text: "50000");
  final List<String> availableInterests = [
    "Culture & Temples",
    "Beaches & Surfing",
    "Wildlife & Safari",
    "Hill Country & Hiking",
    "Local Food & Tea",
    "Heritage & UNESCO",
  ];
  final Set<String> selectedInterests = {"Culture & Temples", "Wildlife & Safari"};

  @override
  void initState() {
    super.initState();
    final dest = widget.initialDestination ?? "Ella";
    destCtrl = TextEditingController(text: dest);
    nameCtrl = TextEditingController(text: widget.initialName ?? "$dest Adventure");
  }

  @override
  void dispose() {
    nameCtrl.dispose();
    destCtrl.dispose();
    startLocCtrl.dispose();
    memberCtrl.dispose();
    budgetCtrl.dispose();
    super.dispose();
  }

  void _addMember() {
    final val = memberCtrl.text.trim();
    if (val.isNotEmpty && !groupMembers.contains(val)) {
      setState(() {
        groupMembers.add(val);
        memberCtrl.clear();
      });
    }
  }

  Future<void> _submitWizard() async {
    if (nameCtrl.text.trim().isEmpty || destCtrl.text.trim().isEmpty) {
      setState(() => error = "Trip name and destination are required.");
      return;
    }

    setState(() {
      isSubmitting = true;
      error = null;
    });

    try {
      final tripRes = await api.createTrip(
        name: nameCtrl.text.trim(),
        destination: destCtrl.text.trim(),
        startDate: startDate.toIso8601String().split('T').first,
        endDate: endDate.toIso8601String().split('T').first,
      );

      final newTripId = tripRes['id']?.toString();

      if (newTripId != null) {
        // Create initial budget if provided
        final budgetVal = double.tryParse(budgetCtrl.text.trim());
        if (budgetVal != null && budgetVal > 0) {
          try {
            await api.createBudget(newTripId, budgetVal, currency: "LKR");
          } catch (_) {}
        }

        // Add group members if group trip
        if (tripMode == "GROUP") {
          for (final m in groupMembers) {
            try {
              await api.addGroupMember(newTripId, m, "$m@travelwise.lk");
            } catch (_) {}
          }
        }
      }

      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      setState(() {
        isSubmitting = false;
        error = e.toString().replaceFirst("Exception: ", "");
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppTheme.cardBackground,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 480, maxHeight: 620),
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.auto_awesome, color: AppTheme.primary, size: 20),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "Trip Creation Wizard",
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
                        ),
                        Text(
                          "Step ${currentStep + 1} of 4",
                          style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                        ),
                      ],
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: AppTheme.textSecondary, size: 20),
                  onPressed: () => Navigator.pop(context, false),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Step Progress Bar
            Row(
              children: List.generate(4, (i) {
                final isPassed = i <= currentStep;
                return Expanded(
                  child: Container(
                    height: 4,
                    margin: EdgeInsets.only(right: i < 3 ? 6 : 0),
                    decoration: BoxDecoration(
                      color: isPassed ? AppTheme.primary : Colors.white12,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                );
              }),
            ),
            const SizedBox(height: 16),

            if (error != null)
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red, size: 16),
                    const SizedBox(width: 8),
                    Expanded(child: Text(error!, style: const TextStyle(color: Colors.red, fontSize: 11.5))),
                  ],
                ),
              ),

            // Step Content
            Expanded(
              child: SingleChildScrollView(
                child: [
                  _buildStep1(),
                  _buildStep2(),
                  _buildStep3(),
                  _buildStep4(),
                ][currentStep],
              ),
            ),
            const SizedBox(height: 16),

            // Bottom Nav Buttons
            Row(
              children: [
                if (currentStep > 0)
                  OutlinedButton(
                    onPressed: () => setState(() => currentStep--),
                    child: const Text("Back"),
                  ),
                const Spacer(),
                if (currentStep < 3)
                  FilledButton(
                    onPressed: () {
                      if (currentStep == 0 && (nameCtrl.text.trim().isEmpty || destCtrl.text.trim().isEmpty)) {
                        setState(() => error = "Please provide both trip name and destination.");
                        return;
                      }
                      setState(() {
                        error = null;
                        currentStep++;
                      });
                    },
                    child: const Text("Next Step →"),
                  )
                else
                  FilledButton.icon(
                    onPressed: isSubmitting ? null : _submitWizard,
                    icon: isSubmitting
                        ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.check, size: 16),
                    label: Text(isSubmitting ? "Creating..." : "Launch Trip"),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // Step 1: Destination & Dates
  Widget _buildStep1() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("1. Trip Details", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white)),
        const SizedBox(height: 12),
        TextField(
          controller: nameCtrl,
          decoration: const InputDecoration(labelText: "Trip Name", prefixIcon: Icon(Icons.bookmark_outline)),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: destCtrl,
          decoration: const InputDecoration(labelText: "Destination in Sri Lanka", prefixIcon: Icon(Icons.location_on_outlined)),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: startLocCtrl,
          decoration: const InputDecoration(labelText: "Starting Location", prefixIcon: Icon(Icons.near_me_outlined)),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: InkWell(
                onTap: () async {
                  final p = await showDatePicker(
                    context: context,
                    initialDate: startDate,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (p != null) setState(() => startDate = p);
                },
                child: InputDecorator(
                  decoration: const InputDecoration(labelText: "Start Date"),
                  child: Text(startDate.toIso8601String().split('T').first, style: const TextStyle(fontSize: 12)),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: InkWell(
                onTap: () async {
                  final p = await showDatePicker(
                    context: context,
                    initialDate: endDate,
                    firstDate: startDate,
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (p != null) setState(() => endDate = p);
                },
                child: InputDecorator(
                  decoration: const InputDecoration(labelText: "End Date"),
                  child: Text(endDate.toIso8601String().split('T').first, style: const TextStyle(fontSize: 12)),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // Step 2: Solo vs Group
  Widget _buildStep2() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("2. Travel Mode & Group Members", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white)),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: ChoiceChip(
                label: const Center(child: Text("👥 Group Trip")),
                selected: tripMode == "GROUP",
                selectedColor: AppTheme.primary.withOpacity(0.25),
                onSelected: (_) => setState(() => tripMode = "GROUP"),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: ChoiceChip(
                label: const Center(child: Text("👤 Solo Explorer")),
                selected: tripMode == "SOLO",
                selectedColor: AppTheme.primary.withOpacity(0.25),
                onSelected: (_) => setState(() => tripMode = "SOLO"),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (tripMode == "GROUP") ...[
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: memberCtrl,
                  decoration: const InputDecoration(
                    labelText: "Add Member Name (e.g. Kasun)",
                    prefixIcon: Icon(Icons.person_add_outlined),
                  ),
                  onSubmitted: (_) => _addMember(),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: _addMember,
                style: FilledButton.styleFrom(padding: const EdgeInsets.all(16)),
                child: const Icon(Icons.add, size: 18),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: groupMembers.map((m) {
              return Chip(
                label: Text(m, style: const TextStyle(fontSize: 12)),
                deleteIcon: const Icon(Icons.close, size: 14),
                onDeleted: () => setState(() => groupMembers.remove(m)),
              );
            }).toList(),
          ),
        ],
      ],
    );
  }

  // Step 3: Travel Method
  Widget _buildStep3() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("3. Transportation Method", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white)),
        const SizedBox(height: 12),
        RadioListTile<String>(
          value: "PRIVATE_VEHICLE",
          groupValue: travelMethod,
          title: const Text("Own Private Vehicle 🚗", style: TextStyle(fontSize: 13, color: Colors.white)),
          subtitle: const Text("Self-driven personal car or bike", style: TextStyle(fontSize: 11)),
          onChanged: (v) => setState(() => travelMethod = v!),
        ),
        RadioListTile<String>(
          value: "RENTAL_VEHICLE",
          groupValue: travelMethod,
          title: const Text("Rental Vehicle Fleet 🔑", style: TextStyle(fontSize: 13, color: Colors.white)),
          subtitle: const Text("Verified rental car, van, SUV or scooter", style: TextStyle(fontSize: 11)),
          onChanged: (v) => setState(() => travelMethod = v!),
        ),
        RadioListTile<String>(
          value: "PUBLIC_TRANSPORT",
          groupValue: travelMethod,
          title: const Text("Public Transit 🚌", style: TextStyle(fontSize: 13, color: Colors.white)),
          subtitle: const Text("Scenic trains (e.g. Ella Odyssey) & expressway buses", style: TextStyle(fontSize: 11)),
          onChanged: (v) => setState(() => travelMethod = v!),
        ),
      ],
    );
  }

  // Step 4: Budget & Interests
  Widget _buildStep4() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("4. Budget & Curated Interests", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white)),
        const SizedBox(height: 12),
        TextField(
          controller: budgetCtrl,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: "Target Budget (LKR)",
            prefixIcon: Icon(Icons.account_balance_wallet_outlined),
          ),
        ),
        const SizedBox(height: 16),
        const Text("Select Travel Interests:", style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: availableInterests.map((interest) {
            final isSel = selectedInterests.contains(interest);
            return FilterChip(
              label: Text(interest, style: TextStyle(fontSize: 11.5, color: isSel ? AppTheme.primary : Colors.white)),
              selected: isSel,
              selectedColor: AppTheme.primary.withOpacity(0.2),
              onSelected: (val) {
                setState(() {
                  if (val) {
                    selectedInterests.add(interest);
                  } else {
                    selectedInterests.remove(interest);
                  }
                });
              },
            );
          }).toList(),
        ),
      ],
    );
  }
}

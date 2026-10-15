import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class TripDetailScreen extends StatefulWidget {
  final Map<String, dynamic> trip;
  const TripDetailScreen({required this.trip, super.key});

  @override
  State<TripDetailScreen> createState() => _TripDetailScreenState();
}

class _TripDetailScreenState extends State<TripDetailScreen>
    with SingleTickerProviderStateMixin {
  final api = ApiService();
  late TabController _tabController;

  String get tripId => widget.trip['id'].toString();

  bool loading = true;
  String? error;

  List<dynamic> activities = [];
  List<dynamic> budgets = [];
  List<dynamic> expenses = [];
  List<dynamic> members = [];
  List<dynamic> risks = [];
  Map<String, dynamic>? settlement;
  Map<String, dynamic>? workflow;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _loadAllTripData();
  }

  Future<void> _loadAllTripData() async {
    setState(() => loading = true);
    try {
      final actF = api.getActivities(tripId);
      final budF = api.getBudgets(tripId);
      final expF = api.getExpenses(tripId);
      final memF = api.getGroupMembers(tripId);
      final rskF = api.getRisks(tripId);
      final setF = api.getSettlement(tripId);

      final results = await Future.wait([actF, budF, expF, memF, rskF]);
      activities = results[0];
      budgets = results[1];
      expenses = results[2];
      members = results[3];
      risks = results[4];
      settlement = await setF;

      setState(() {
        loading = false;
        error = null;
      });
    } catch (e) {
      setState(() {
        loading = false;
        error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  // --- ACTIONS ---

  Future<void> _addActivity() async {
    final nameCtrl = TextEditingController();
    final locCtrl = TextEditingController(text: widget.trip['destination'] ?? 'Sri Lanka');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Add Itinerary Activity"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: "Activity Name (e.g. Hike Pidurangala)")),
            const SizedBox(height: 12),
            TextField(controller: locCtrl, decoration: const InputDecoration(labelText: "Location")),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text("Cancel")),
          FilledButton(
            onPressed: () async {
              if (nameCtrl.text.trim().isEmpty) return;
              try {
                final now = DateTime.now();
                await api.createActivity(
                  tripId: tripId,
                  name: nameCtrl.text.trim(),
                  location: locCtrl.text.trim(),
                  startAt: now.toIso8601String(),
                  endAt: now.add(const Duration(hours: 2)).toIso8601String(),
                );
                if (mounted) Navigator.pop(ctx, true);
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
              }
            },
            child: const Text("Add"),
          ),
        ],
      ),
    );
    if (ok == true) _loadAllTripData();
  }

  Future<void> _addBudget() async {
    final amountCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Set Target Budget"),
        content: TextField(
          controller: amountCtrl,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: "Amount (LKR)", prefixText: "LKR "),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text("Cancel")),
          FilledButton(
            onPressed: () async {
              final val = double.tryParse(amountCtrl.text);
              if (val == null || val <= 0) return;
              try {
                await api.createBudget(tripId, val);
                if (mounted) Navigator.pop(ctx, true);
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
              }
            },
            child: const Text("Save Budget"),
          ),
        ],
      ),
    );
    if (ok == true) _loadAllTripData();
  }

  Future<void> _addExpense() async {
    final descCtrl = TextEditingController();
    final amountCtrl = TextEditingController();
    final payerCtrl = TextEditingController(text: "Me");
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Log Shared Expense"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: descCtrl, decoration: const InputDecoration(labelText: "Description (e.g. Seafood Dinner)")),
            const SizedBox(height: 12),
            TextField(controller: amountCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: "Amount (LKR)")),
            const SizedBox(height: 12),
            TextField(controller: payerCtrl, decoration: const InputDecoration(labelText: "Paid By (Name)")),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text("Cancel")),
          FilledButton(
            onPressed: () async {
              final val = double.tryParse(amountCtrl.text);
              if (val == null || val <= 0 || descCtrl.text.isEmpty) return;
              try {
                await api.createExpense(
                  tripId: tripId,
                  description: descCtrl.text.trim(),
                  amount: val,
                  paidBy: payerCtrl.text.trim(),
                );
                if (mounted) Navigator.pop(ctx, true);
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
              }
            },
            child: const Text("Save Expense"),
          ),
        ],
      ),
    );
    if (ok == true) _loadAllTripData();
  }

  Future<void> _captureReceipt() async {
    final picker = ImagePicker();
    final choice = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt, color: AppTheme.primary),
              title: const Text("Take Photo with Camera"),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library, color: AppTheme.primary),
              title: const Text("Choose from Gallery"),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );

    if (choice == null) return;
    final picked = await picker.pickImage(source: choice);
    if (picked == null) return;

    try {
      final Uint8List bytes = await picked.readAsBytes();
      final filename = "receipt_${DateTime.now().millisecondsSinceEpoch}.jpg";

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Uploading receipt to Supabase Cloud Storage...")),
      );

      await api.uploadReceipt(bytes, filename);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppTheme.success,
          content: Text("Receipt captured & stored securely!"),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(backgroundColor: AppTheme.danger, content: Text("Upload error: $e")),
      );
    }
  }

  Future<void> _addGroupMember() async {
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Invite Group Member"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: "Display Name")),
            const SizedBox(height: 12),
            TextField(controller: emailCtrl, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: "Email Address")),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text("Cancel")),
          FilledButton(
            onPressed: () async {
              if (nameCtrl.text.isEmpty) return;
              try {
                await api.addGroupMember(tripId, nameCtrl.text.trim(), emailCtrl.text.trim());
                if (mounted) Navigator.pop(ctx, true);
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
              }
            },
            child: const Text("Invite"),
          ),
        ],
      ),
    );
    if (ok == true) _loadAllTripData();
  }

  Future<void> _runAiWorkflow() async {
    setState(() => loading = true);
    try {
      final res = await api.startWorkflow(
        tripId,
        "Generate multi-agent travel itinerary, budget bounds, risk assessment, and debt settlement recommendation.",
      );
      setState(() {
        workflow = res;
        loading = false;
      });
      _tabController.animateTo(4); // Switch to AI tab
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppTheme.primary,
          content: Text("Multi-agent AI workflow created!"),
        ),
      );
    } catch (e) {
      setState(() => loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(backgroundColor: AppTheme.danger, content: Text("AI Error: $e")),
      );
    }
  }

  Future<void> _submitApproval(bool approved) async {
    if (workflow == null) return;
    try {
      final res = await api.submitApproval(
        workflow!['id'].toString(),
        approved,
        approved ? "Approved via Flutter Mobile App" : "Rejected via Flutter Mobile App",
      );
      setState(() => workflow = res);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: approved ? AppTheme.success : AppTheme.danger,
          content: Text(approved ? "AI Plan Approved!" : "AI Plan Rejected."),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    final tripName = widget.trip['name']?.toString() ?? 'Trip Details';
    final dest = widget.trip['destination']?.toString() ?? '';
    final start = widget.trip['startDate']?.toString() ?? '';
    final end = widget.trip['endDate']?.toString() ?? '';

    final totalBudget = budgets.fold<double>(0, (sum, b) => sum + (b['amount'] as num? ?? 0).toDouble());
    final totalExpense = expenses.fold<double>(0, (sum, e) => sum + (e['amount'] as num? ?? 0).toDouble());

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(tripName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            Text(
              start.isNotEmpty ? "$dest ($start - $end)" : dest,
              style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: "Generate AI Plan",
            onPressed: _runAiWorkflow,
            icon: const Icon(Icons.auto_awesome, color: AppTheme.primary),
          ),
          IconButton(
            tooltip: "Refresh Data",
            onPressed: _loadAllTripData,
            icon: const Icon(Icons.refresh),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          labelColor: AppTheme.primary,
          unselectedLabelColor: AppTheme.textMuted,
          indicatorColor: AppTheme.primary,
          tabs: const [
            Tab(icon: Icon(Icons.calendar_today, size: 18), text: "Itinerary"),
            Tab(icon: Icon(Icons.account_balance_wallet, size: 18), text: "Budget"),
            Tab(icon: Icon(Icons.group, size: 18), text: "Group"),
            Tab(icon: Icon(Icons.shield, size: 18), text: "Safety"),
            Tab(icon: Icon(Icons.smart_toy, size: 18), text: "AI Plan"),
          ],
        ),
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadAllTripData,
              child: TabBarView(
                controller: _tabController,
                children: [
                  // Tab 1: Itinerary Activities
                  _buildActivitiesTab(),

                  // Tab 2: Budget & Expenses + Receipts
                  _buildBudgetTab(totalBudget, totalExpense),

                  // Tab 3: Group & Settlement
                  _buildGroupTab(),

                  // Tab 4: Safety & Risks
                  _buildSafetyTab(),

                  // Tab 5: AI Plan & Approvals
                  _buildAiTab(),
                ],
              ),
            ),
    );
  }

  // --- TAB 1: ITINERARY ---
  Widget _buildActivitiesTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text("Scheduled Activities", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            FilledButton.tonalIcon(
              onPressed: _addActivity,
              icon: const Icon(Icons.add, size: 18),
              label: const Text("Add Activity"),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (activities.isEmpty)
          Container(
            padding: const EdgeInsets.all(32),
            alignment: Alignment.center,
            child: Column(
              children: const [
                Icon(Icons.event_note, size: 48, color: AppTheme.textMuted),
                SizedBox(height: 12),
                Text("No activities scheduled yet.", style: TextStyle(color: AppTheme.textMuted)),
              ],
            ),
          ),
        ...activities.map((act) => Card(
              child: ListTile(
                leading: const CircleAvatar(
                  backgroundColor: Color(0xFFE0F2FE),
                  child: Icon(Icons.place, color: Color(0xFF0284C7)),
                ),
                title: Text(act['name']?.toString() ?? 'Activity', style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text("Location: ${act['location'] ?? 'TBD'}\nTime: ${act['startAt']?.toString().substring(0, 10) ?? ''}"),
              ),
            )),
      ],
    );
  }

  // --- TAB 2: BUDGET & EXPENSES ---
  Widget _buildBudgetTab(double totalBudget, double totalExpense) {
    final progress = totalBudget > 0 ? (totalExpense / totalBudget).clamp(0.0, 1.0) : 0.0;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Budget vs Expense Progress Card
        Card(
          color: Colors.white,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("Budget Overview", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    Text(
                      totalBudget > 0 ? "${totalBudget.toInt()} LKR" : "No budget set",
                      style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                LinearProgressIndicator(
                  value: progress,
                  minHeight: 10,
                  borderRadius: BorderRadius.circular(5),
                  backgroundColor: const Color(0xFFE2E8F0),
                  color: totalExpense > totalBudget && totalBudget > 0 ? AppTheme.danger : AppTheme.primary,
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text("Spent: ${totalExpense.toInt()} LKR", style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                    Text(
                      totalBudget > 0 ? "Remaining: ${(totalBudget - totalExpense).toInt()} LKR" : "",
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: (totalBudget - totalExpense) < 0 ? AppTheme.danger : AppTheme.success,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Action Buttons Row
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _addBudget,
                icon: const Icon(Icons.savings_outlined, size: 18),
                label: const Text("Set Budget"),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: FilledButton.icon(
                onPressed: _addExpense,
                icon: const Icon(Icons.add, size: 18),
                label: const Text("Log Expense"),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),

        // 📸 Camera Receipt Upload Card
        Card(
          color: const Color(0xFFF0FDFA),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: const BorderSide(color: Color(0xFF99F6E4)),
          ),
          child: ListTile(
            leading: const CircleAvatar(
              backgroundColor: AppTheme.primary,
              child: Icon(Icons.camera_alt, color: Colors.white),
            ),
            title: const Text("Scan / Upload Bill Receipt", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            subtitle: const Text("Upload hotel or dinner receipt to Supabase Storage", style: TextStyle(fontSize: 12)),
            trailing: const Icon(Icons.chevron_right),
            onTap: _captureReceipt,
          ),
        ),
        const SizedBox(height: 16),

        const Text("Logged Expenses", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        if (expenses.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(child: Text("No expenses logged yet.", style: TextStyle(color: AppTheme.textMuted))),
          ),
        ...expenses.map((exp) => Card(
              child: ListTile(
                leading: const CircleAvatar(
                  backgroundColor: Color(0xFFFEF3C7),
                  child: Icon(Icons.receipt, color: Color(0xFFD97706)),
                ),
                title: Text(exp['description']?.toString() ?? 'Expense', style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text("Paid by: ${exp['paidBy'] ?? 'Unknown'}"),
                trailing: Text(
                  "${(exp['amount'] as num?)?.toInt() ?? 0} ${exp['currency'] ?? 'LKR'}",
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ),
            )),
      ],
    );
  }

  // --- TAB 3: GROUP & DEBT SETTLEMENT ---
  Widget _buildGroupTab() {
    final transfers = settlement != null ? (settlement!['transfers'] as List<dynamic>? ?? []) : [];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text("Travel Companions", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            FilledButton.tonalIcon(
              onPressed: _addGroupMember,
              icon: const Icon(Icons.person_add, size: 18),
              label: const Text("Invite Member"),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (members.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 20),
            child: Center(child: Text("Solo trip. Add companions to enable bill splitting.", style: TextStyle(color: AppTheme.textMuted))),
          ),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: members.map((m) => Chip(
                avatar: CircleAvatar(
                  backgroundColor: AppTheme.primary,
                  child: Text(
                    (m['displayName']?.toString() ?? 'U')[0].toUpperCase(),
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                  ),
                ),
                label: Text(m['displayName']?.toString() ?? 'Member'),
              )).toList(),
        ),
        const SizedBox(height: 24),

        // Split-Bill Debt Settlement Plan
        Row(
          children: const [
            Icon(Icons.handshake, color: AppTheme.primary),
            SizedBox(width: 8),
            Text("Minimum Cash-Flow Settlements", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          "Auto-calculated net debts using the graph settlement algorithm:",
          style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
        ),
        const SizedBox(height: 12),
        if (transfers.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Text(
                  expenses.isEmpty ? "Log expenses to view debt settlement." : "All expenses are balanced! No debts pending.",
                  style: const TextStyle(color: AppTheme.textMuted),
                ),
              ),
            ),
          ),
        ...transfers.map((t) => Card(
              color: const Color(0xFFF8FAFC),
              child: ListTile(
                leading: const CircleAvatar(
                  backgroundColor: Color(0xFFDCFCE7),
                  child: Icon(Icons.swap_horiz, color: Color(0xFF16A34A)),
                ),
                title: RichText(
                  text: TextSpan(
                    style: const TextStyle(color: Colors.black, fontSize: 14),
                    children: [
                      TextSpan(text: t['fromMember']?.toString() ?? 'Member', style: const TextStyle(fontWeight: FontWeight.bold)),
                      const TextSpan(text: " pays "),
                      TextSpan(text: t['toMember']?.toString() ?? 'Member', style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                trailing: Text(
                  "${(t['amount'] as num?)?.toInt() ?? 0} ${t['currency'] ?? 'LKR'}",
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF16A34A)),
                ),
              ),
            )),
      ],
    );
  }

  // --- TAB 4: SAFETY & RISKS ---
  Widget _buildSafetyTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: const [
            Icon(Icons.cloud, color: Colors.blue),
            SizedBox(width: 8),
            Text("Open-Meteo Weather & Safety", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 12),
        if (risks.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: const [
                  Icon(Icons.wb_sunny, color: Colors.orange, size: 40),
                  SizedBox(height: 12),
                  Text("Optimal weather conditions detected. No severe weather or safety alerts recorded.", textAlign: TextAlign.center),
                ],
              ),
            ),
          ),
        ...risks.map((r) {
          final sev = r['severity']?.toString() ?? 'Low';
          final isHigh = sev.toLowerCase() == 'high';
          return Card(
            color: isHigh ? const Color(0xFFFEF2F2) : Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: BorderSide(color: isHigh ? const Color(0xFFFCA5A5) : const Color(0xFFE2E8F0)),
            ),
            child: ListTile(
              leading: Icon(
                isHigh ? Icons.warning_amber_rounded : Icons.info_outline,
                color: isHigh ? AppTheme.danger : AppTheme.primary,
              ),
              title: Text(r['summary']?.toString() ?? 'Risk assessment', style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text(r['weatherSummary']?.toString() ?? 'Advisory note'),
              trailing: Chip(
                label: Text(sev, style: TextStyle(color: isHigh ? Colors.white : AppTheme.primaryDark, fontSize: 11, fontWeight: FontWeight.bold)),
                backgroundColor: isHigh ? AppTheme.danger : const Color(0xFFCCFBF1),
              ),
            ),
          );
        }),
      ],
    );
  }

  // --- TAB 5: AI PLAN & HUMAN APPROVAL ---
  Widget _buildAiTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          color: const Color(0xFFF5F3FF),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFFDDD6FE)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: const [
                    Icon(Icons.smart_toy, color: Color(0xFF7C3AED)),
                    SizedBox(width: 8),
                    Text("Agentic AI System (Gemini)", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF5B21B6))),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  "Coordinates 4 specialized AI agents to generate structured itineraries, budget constraints, risk advisories, and split-bill strategies.",
                  style: TextStyle(fontSize: 13, color: Color(0xFF4C1D95)),
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: _runAiWorkflow,
                  icon: const Icon(Icons.play_arrow),
                  label: const Text("Run Multi-Agent Planner"),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        if (workflow == null)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 32),
            child: Center(
              child: Text("Tap 'Run Multi-Agent Planner' to synthesize recommendations.", style: TextStyle(color: AppTheme.textMuted)),
            ),
          ),

        if (workflow != null) ...[
          const Text("Workflow Execution Result", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text("Status:", style: TextStyle(fontWeight: FontWeight.bold)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: workflow!['status'] == 'Approved'
                              ? const Color(0xFFDCFCE7)
                              : workflow!['status'] == 'AwaitingApproval'
                                  ? const Color(0xFFFEF3C7)
                                  : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          workflow!['status']?.toString() ?? '',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: workflow!['status'] == 'Approved' ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text("Objective: ${workflow!['objective'] ?? ''}", style: const TextStyle(color: Color(0xFF475569))),
                  const Divider(height: 24),

                  // Human in the loop approval controls
                  if (workflow!['status'] == 'AwaitingApproval') ...[
                    const Text("Human-in-the-Loop Oversight:", style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    const Text("Review the AI plan. You can approve or reject this recommendation:", style: TextStyle(fontSize: 13, color: AppTheme.textMuted)),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _submitApproval(false),
                            icon: const Icon(Icons.close, color: AppTheme.danger),
                            label: const Text("Reject", style: TextStyle(color: AppTheme.danger)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: FilledButton.icon(
                            onPressed: () => _submitApproval(true),
                            style: FilledButton.styleFrom(backgroundColor: AppTheme.success),
                            icon: const Icon(Icons.check),
                            label: const Text("Approve Plan"),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}

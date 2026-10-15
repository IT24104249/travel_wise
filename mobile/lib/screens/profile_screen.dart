import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class ProfileScreen extends StatefulWidget {
  final VoidCallback onSignOut;
  const ProfileScreen({required this.onSignOut, super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final api = ApiService();
  Map<String, dynamic>? user;
  bool isProvider = false;
  List<dynamic> listings = [];
  bool loadingListings = false;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final u = await api.getCurrentUser();
    setState(() {
      user = u;
      final role = (u?['role'] ?? '').toString().toLowerCase();
      isProvider = role.contains('provider');
    });
    if (isProvider) _loadListings();
  }

  Future<void> _loadListings() async {
    setState(() => loadingListings = true);
    try {
      final items = await api.getCatalogItems();
      setState(() {
        listings = items;
        loadingListings = false;
      });
    } catch (_) {
      setState(() => loadingListings = false);
    }
  }

  Future<void> _showChangePasswordDialog() async {
    final oldPassCtrl = TextEditingController();
    final newPassCtrl = TextEditingController();
    final confirmPassCtrl = TextEditingController();
    String? localError;

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlgState) => AlertDialog(
          title: const Text("Change Password"),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (localError != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(localError!, style: const TextStyle(color: Colors.red, fontSize: 12)),
                ),
              TextField(
                controller: oldPassCtrl,
                obscureText: true,
                decoration: const InputDecoration(labelText: "Current Password"),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: newPassCtrl,
                obscureText: true,
                decoration: const InputDecoration(labelText: "New Password (min 6 chars)"),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: confirmPassCtrl,
                obscureText: true,
                decoration: const InputDecoration(labelText: "Confirm New Password"),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
            FilledButton(
              onPressed: () async {
                if (newPassCtrl.text.length < 6) {
                  setDlgState(() => localError = "New password must be at least 6 characters.");
                  return;
                }
                if (newPassCtrl.text != confirmPassCtrl.text) {
                  setDlgState(() => localError = "Passwords do not match.");
                  return;
                }
                try {
                  await api.changePassword(
                    oldPassword: oldPassCtrl.text,
                    newPassword: newPassCtrl.text,
                  );
                  if (mounted) {
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("Password updated successfully!")),
                    );
                  }
                } catch (e) {
                  setDlgState(() => localError = e.toString().replaceFirst("Exception: ", ""));
                }
              },
              child: const Text("Update Password"),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showAddListingDialog() async {
    final nameCtrl = TextEditingController();
    final destCtrl = TextEditingController(text: "Ella, Sri Lanka");
    final descCtrl = TextEditingController();
    final priceCtrl = TextEditingController();
    int selectedType = 0; // 0 = Visiting Place, 1 = Restaurant, 2 = Hotel

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text("Publish Travel Listing"),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<int>(
                  value: selectedType,
                  decoration: const InputDecoration(labelText: "Service Category"),
                  items: const [
                    DropdownMenuItem(value: 0, child: Text("Visiting Place / Attraction")),
                    DropdownMenuItem(value: 1, child: Text("Restaurant / Dining")),
                    DropdownMenuItem(value: 2, child: Text("Accommodation / Hotel")),
                  ],
                  onChanged: (v) => setDialogState(() => selectedType = v ?? 0),
                ),
                const SizedBox(height: 12),
                TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: "Business / Place Name")),
                const SizedBox(height: 12),
                TextField(controller: destCtrl, decoration: const InputDecoration(labelText: "Destination Region")),
                const SizedBox(height: 12),
                TextField(controller: descCtrl, maxLines: 2, decoration: const InputDecoration(labelText: "Brief Description")),
                const SizedBox(height: 12),
                TextField(controller: priceCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: "Price / Average Cost (LKR)")),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text("Cancel")),
            FilledButton(
              onPressed: () async {
                if (nameCtrl.text.isEmpty || descCtrl.text.isEmpty) return;
                try {
                  await api.createCatalogItem(
                    type: selectedType,
                    name: nameCtrl.text.trim(),
                    destination: destCtrl.text.trim(),
                    description: descCtrl.text.trim(),
                    price: double.tryParse(priceCtrl.text) ?? 0.0,
                  );
                  if (mounted) Navigator.pop(ctx, true);
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                }
              },
              child: const Text("Submit Listing"),
            ),
          ],
        ),
      ),
    );

    if (ok == true) {
      _loadListings();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppTheme.success,
          content: Text("Listing submitted successfully! Awaiting staff moderation."),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final email = (user?['email'] ?? '').toString();
    final displayName = (user?['displayName'] ?? '').toString();
    final role = (user?['role'] ?? 'Traveller').toString();

    final displayInitial = displayName.isNotEmpty
        ? displayName[0].toUpperCase()
        : email.isNotEmpty
            ? email[0].toUpperCase()
            : 'U';

    return Scaffold(
      appBar: AppBar(
        title: const Text("My Account"),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Profile Header Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: AppTheme.primary,
                    child: Text(
                      displayInitial,
                      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (displayName.isNotEmpty) ...[
                          Text(
                            displayName,
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            email,
                            style: const TextStyle(fontSize: 13, color: AppTheme.textMuted),
                          ),
                        ] else ...[
                          Text(
                            email.isNotEmpty ? email : "TravelWise User",
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                        ],
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(
                            color: isProvider ? const Color(0xFFFEF3C7) : const Color(0xFFCCFBF1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            isProvider ? "Service Provider" : "Traveller",
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: isProvider ? const Color(0xFFB45309) : AppTheme.primaryDark,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Provider Specific Section
          if (isProvider) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text("Service Provider Hub", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                FilledButton.tonalIcon(
                  onPressed: _showAddListingDialog,
                  icon: const Icon(Icons.add_business, size: 18),
                  label: const Text("Add Listing"),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              "Manage tourist visiting spots, accommodations, restaurants and rental offerings:",
              style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
            ),
            const SizedBox(height: 12),
            if (loadingListings)
              const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator()))
            else if (listings.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Column(
                      children: const [
                        Icon(Icons.storefront, size: 40, color: AppTheme.textMuted),
                        SizedBox(height: 8),
                        Text("No listings published yet. Tap 'Add Listing' to register a hotel or attraction.", textAlign: TextAlign.center),
                      ],
                    ),
                  ),
                ),
              )
            else
              ...listings.take(5).map((l) => Card(
                    child: ListTile(
                      leading: const CircleAvatar(
                        backgroundColor: Color(0xFFE0E7FF),
                        child: Icon(Icons.place, color: Color(0xFF4338CA)),
                      ),
                      title: Text(l['name']?.toString() ?? 'Listing', style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text("${l['destination'] ?? ''} • ${(l['price'] as num?)?.toInt() ?? 0} LKR"),
                      trailing: Chip(
                        label: Text(l['isApproved'] == true ? "Approved" : "Pending", style: const TextStyle(fontSize: 11)),
                        backgroundColor: l['isApproved'] == true ? const Color(0xFFDCFCE7) : const Color(0xFFFEF9C3),
                      ),
                    ),
                  )),
            const SizedBox(height: 24),
          ],

          // App Architecture & Integrity Info
          Card(
            color: const Color(0xFFF8FAFC),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("System Integration Status", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  const SizedBox(height: 10),
                  _buildStatusRow("Backend API:", "ASP.NET Core (Port 5127)", Colors.green),
                  const SizedBox(height: 6),
                  _buildStatusRow("Database:", "Supabase PostgreSQL (Active)", Colors.green),
                  const SizedBox(height: 6),
                  _buildStatusRow("AI Service:", "Python FastAPI + Gemini", Colors.green),
                  const SizedBox(height: 6),
                  _buildStatusRow("Cloud Storage:", "Supabase Receipts Bucket", Colors.green),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Security Settings (Change Password)
          Card(
            child: ListTile(
              leading: const CircleAvatar(
                backgroundColor: Color(0xFFFEF3C7),
                child: Icon(Icons.lock_reset, color: Color(0xFFD97706)),
              ),
              title: const Text("Change Password", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              subtitle: const Text("Update your TravelWise account password", style: TextStyle(fontSize: 12)),
              trailing: const Icon(Icons.chevron_right),
              onTap: _showChangePasswordDialog,
            ),
          ),
          const SizedBox(height: 16),

          // Sign Out Button
          FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFFFEE2E2),
              foregroundColor: AppTheme.danger,
            ),
            onPressed: () async {
              await api.clearToken();
              widget.onSignOut();
            },
            icon: const Icon(Icons.logout),
            label: const Text("Sign Out of TravelWise"),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusRow(String label, String value, Color color) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: AppTheme.textMuted)),
        Row(
          children: [
            Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
            const SizedBox(width: 6),
            Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
          ],
        ),
      ],
    );
  }
}

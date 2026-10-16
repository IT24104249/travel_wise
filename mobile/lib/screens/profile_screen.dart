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

  Future<void> _showEditProfileDialog() async {
    final nameCtrl = TextEditingController(text: user?['displayName']?.toString() ?? '');
    final phoneCtrl = TextEditingController(text: user?['contactPhone']?.toString() ?? '');
    String? localError;
    bool saving = false;

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlgState) => AlertDialog(
          title: const Text("Edit Profile Details"),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (localError != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(localError!, style: const TextStyle(color: Colors.red, fontSize: 12)),
                ),
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(
                  labelText: "Display Name",
                  prefixIcon: Icon(Icons.person_outline),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: "Contact Phone Number",
                  prefixIcon: Icon(Icons.phone_outlined),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: saving ? null : () => Navigator.pop(ctx),
              child: const Text("Cancel"),
            ),
            FilledButton(
              onPressed: saving
                  ? null
                  : () async {
                      if (nameCtrl.text.trim().isEmpty) {
                        setDlgState(() => localError = "Display name cannot be empty.");
                        return;
                      }
                      setDlgState(() {
                        saving = true;
                        localError = null;
                      });
                      try {
                        await api.updateProfile(
                          displayName: nameCtrl.text.trim(),
                          contactPhone: phoneCtrl.text.trim().isNotEmpty ? phoneCtrl.text.trim() : null,
                        );
                        if (mounted) {
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text("Profile updated successfully!")),
                          );
                          _loadUser();
                        }
                      } catch (e) {
                        setDlgState(() {
                          saving = false;
                          localError = e.toString().replaceFirst("Exception: ", "");
                        });
                      }
                    },
              child: Text(saving ? "Saving..." : "Save Details"),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showDeleteAccountDialog() async {
    final confirmCtrl = TextEditingController();
    String? localError;
    bool deleting = false;

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlgState) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: AppTheme.danger),
              SizedBox(width: 8),
              Text("Delete Account"),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                "Warning: This action is permanent. All your planned trips, expenses, and records will be deleted.",
                style: TextStyle(fontSize: 13, color: AppTheme.textMuted),
              ),
              const SizedBox(height: 12),
              const Text(
                "Type \"DELETE\" below to confirm:",
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
              const SizedBox(height: 8),
              if (localError != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(localError!, style: const TextStyle(color: Colors.red, fontSize: 12)),
                ),
              TextField(
                controller: confirmCtrl,
                decoration: const InputDecoration(
                  hintText: "DELETE",
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: deleting ? null : () => Navigator.pop(ctx),
              child: const Text("Cancel"),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: AppTheme.danger,
                foregroundColor: Colors.white,
              ),
              onPressed: deleting
                  ? null
                  : () async {
                      if (confirmCtrl.text.trim() != "DELETE") {
                        setDlgState(() => localError = "Please type DELETE exactly to confirm.");
                        return;
                      }
                      setDlgState(() {
                        deleting = true;
                        localError = null;
                      });
                      try {
                        await api.deleteAccount(confirmationText: "DELETE");
                        if (mounted) {
                          Navigator.pop(ctx);
                          widget.onSignOut();
                        }
                      } catch (e) {
                        setDlgState(() {
                          deleting = false;
                          localError = e.toString().replaceFirst("Exception: ", "");
                        });
                      }
                    },
              child: Text(deleting ? "Deleting..." : "Permanently Delete"),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Account & Profile"),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            tooltip: "Edit Profile",
            onPressed: _showEditProfileDialog,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Header Profile Card
          Card(
            color: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 32,
                    backgroundColor: AppTheme.primary.withOpacity(0.12),
                    child: Text(
                      (user?['displayName']?.toString() ?? 'U').substring(0, 1).toUpperCase(),
                      style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: AppTheme.primary),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user?['displayName']?.toString() ?? 'TravelWise Explorer',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          user?['email']?.toString() ?? 'Signed In',
                          style: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: isProvider ? const Color(0xFFFEF3C7) : const Color(0xFFE0E7FF),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            isProvider ? "Service Provider" : "Traveller",
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: isProvider ? const Color(0xFFB45309) : const Color(0xFF4338CA),
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

          // Edit Profile Details Tile
          Card(
            child: ListTile(
              leading: const CircleAvatar(
                backgroundColor: Color(0xFFE0F2FE),
                child: Icon(Icons.person, color: Color(0xFF0284C7)),
              ),
              title: const Text("Edit Profile Details", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              subtitle: const Text("Update display name and contact phone", style: TextStyle(fontSize: 12)),
              trailing: const Icon(Icons.chevron_right),
              onTap: _showEditProfileDialog,
            ),
          ),
          const SizedBox(height: 10),

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
          const SizedBox(height: 10),

          // Danger Zone (Delete Account)
          Card(
            child: ListTile(
              leading: const CircleAvatar(
                backgroundColor: Color(0xFFFEE2E2),
                child: Icon(Icons.delete_forever, color: AppTheme.danger),
              ),
              title: const Text("Delete Account", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.danger)),
              subtitle: const Text("Permanently delete account and all data", style: TextStyle(fontSize: 12)),
              trailing: const Icon(Icons.chevron_right),
              onTap: _showDeleteAccountDialog,
            ),
          ),
          const SizedBox(height: 24),

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
}

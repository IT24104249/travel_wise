import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class AuthScreen extends StatefulWidget {
  final VoidCallback onSignedIn;
  const AuthScreen({required this.onSignedIn, super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final api = ApiService();
  final emailCtrl = TextEditingController();
  final passCtrl = TextEditingController();
  final nameCtrl = TextEditingController();
  final phoneCtrl = TextEditingController();

  bool isRegister = false;
  String selectedRole = "User"; // "User" (Traveller) or "ServiceProvider"
  String selectedServiceType = "Accommodation & Dining";
  bool busy = false;
  String? error;
  bool obscurePassword = true;

  @override
  void dispose() {
    emailCtrl.dispose();
    passCtrl.dispose();
    nameCtrl.dispose();
    phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = emailCtrl.text.trim();
    final password = passCtrl.text;

    if (email.isEmpty || password.isEmpty) {
      setState(() => error = "Please enter both email and password.");
      return;
    }

    setState(() {
      busy = true;
      error = null;
    });

    try {
      if (isRegister) {
        if (selectedRole == "ServiceProvider" && phoneCtrl.text.trim().isEmpty) {
          setState(() {
            error = "Contact phone number is required for Service Providers.";
            busy = false;
          });
          return;
        }

        await api.register(
          email,
          password,
          role: selectedRole,
          displayName: nameCtrl.text.trim().isNotEmpty ? nameCtrl.text.trim() : null,
          contactPhone: selectedRole == "ServiceProvider" ? phoneCtrl.text.trim() : null,
          serviceType: selectedRole == "ServiceProvider" ? selectedServiceType : null,
        );
        // Try auto-login after successful registration
        try {
          await api.login(email, password);
          widget.onSignedIn();
          return;
        } catch (_) {
          setState(() {
            isRegister = false;
            error = "Account created successfully! Please sign in with your credentials.";
            busy = false;
          });
          return;
        }
      } else {
        await api.login(email, password);
        widget.onSignedIn();
      }
    } catch (e) {
      setState(() {
        error = e.toString().replaceFirst('Exception: ', '');
        busy = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Luxury Cover Header with Sigiriya Golden Sunrise
            Stack(
              children: [
                Container(
                  height: 250,
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Image.asset(
                    "assets/images/sigiriya-golden.jpg",
                    fit: BoxFit.cover,
                  ),
                ),
                Container(
                  height: 250,
                  decoration: BoxDecoration(
                    borderRadius: const BorderRadius.vertical(bottom: Radius.circular(32)),
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.black.withOpacity(0.3),
                        const Color(0xFF0F172A).withOpacity(0.6),
                        const Color(0xFF0F172A).withOpacity(0.92),
                      ],
                      stops: const [0.0, 0.5, 1.0],
                    ),
                  ),
                ),
                Positioned.fill(
                  child: SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF59E0B).withOpacity(0.95),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Text(
                              "✨ WONDER OF ASIA",
                              style: TextStyle(
                                color: Color(0xFF1E1B4B),
                                fontWeight: FontWeight.w900,
                                fontSize: 10,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          const Text(
                            "TravelWise",
                            style: TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                              letterSpacing: -0.5,
                              shadows: [
                                Shadow(color: Colors.black, blurRadius: 12, offset: Offset(0, 2)),
                              ],
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            "Intelligent Full-Stack AI Travel Companion for Sri Lanka",
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.9),
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [


                // Sign In / Create Account Toggle
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() {
                            isRegister = false;
                            error = null;
                          }),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: !isRegister ? Colors.white : Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                              boxShadow: !isRegister
                                  ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                                  : null,
                            ),
                            child: Text(
                              "Sign In",
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontWeight: !isRegister ? FontWeight.bold : FontWeight.w500,
                                color: !isRegister ? AppTheme.primaryDark : AppTheme.textMuted,
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() {
                            isRegister = true;
                            error = null;
                          }),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: isRegister ? Colors.white : Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                              boxShadow: isRegister
                                  ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                                  : null,
                            ),
                            child: Text(
                              "Create Account",
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontWeight: isRegister ? FontWeight.bold : FontWeight.w500,
                                color: isRegister ? AppTheme.primaryDark : AppTheme.textMuted,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Error / Success Banner
                if (error != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: error!.contains("successfully")
                          ? const Color(0xFFECFDF5)
                          : const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: error!.contains("successfully")
                            ? const Color(0xFFA7F3D0)
                            : const Color(0xFFFECACA),
                      ),
                    ),
                    child: Text(
                      error!,
                      style: TextStyle(
                        color: error!.contains("successfully")
                            ? const Color(0xFF065F46)
                            : AppTheme.danger,
                        fontSize: 13,
                      ),
                    ),
                  ),

                // Role Selection Tabs & Fields if Registering
                if (isRegister) ...[
                  const Text(
                    "Choose Account Role",
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      // Traveller Role Tab
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => selectedRole = "User"),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
                            decoration: BoxDecoration(
                              color: selectedRole == "User" ? const Color(0xFFF0FDF4) : Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: selectedRole == "User" ? const Color(0xFF10B981) : Colors.grey.shade300,
                                width: selectedRole == "User" ? 2 : 1,
                              ),
                            ),
                            child: Column(
                              children: [
                                const Text("🧳", style: TextStyle(fontSize: 22)),
                                const SizedBox(height: 4),
                                Text(
                                  "Traveller",
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                    color: selectedRole == "User" ? const Color(0xFF047857) : AppTheme.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  "Plan trips",
                                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Service Provider Role Tab
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => selectedRole = "ServiceProvider"),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
                            decoration: BoxDecoration(
                              color: selectedRole == "ServiceProvider" ? const Color(0xFFFFFBEB) : Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: selectedRole == "ServiceProvider" ? const Color(0xFFF59E0B) : Colors.grey.shade300,
                                width: selectedRole == "ServiceProvider" ? 2 : 1,
                              ),
                            ),
                            child: Column(
                              children: [
                                const Text("🏨", style: TextStyle(fontSize: 22)),
                                const SizedBox(height: 4),
                                Text(
                                  "Provider",
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                    color: selectedRole == "ServiceProvider" ? const Color(0xFFB45309) : AppTheme.textMain,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  "List business",
                                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Verification status notice
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: selectedRole == "ServiceProvider" ? const Color(0xFFFEF3C7) : const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Text(selectedRole == "ServiceProvider" ? "⏳ " : "⚡ "),
                        Expanded(
                          child: Text(
                            selectedRole == "ServiceProvider"
                                ? "Admin Review: Provider accounts require administrator approval before listings go live."
                                : "Instant Access: Traveller accounts are activated immediately.",
                            style: TextStyle(
                              fontSize: 11.5,
                              color: selectedRole == "ServiceProvider" ? const Color(0xFF92400E) : const Color(0xFF065F46),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Name field (Full Name or Business Name)
                  TextField(
                    controller: nameCtrl,
                    decoration: InputDecoration(
                      labelText: selectedRole == "ServiceProvider" ? "Business / Organization Name" : "Your Full Name",
                      hintText: selectedRole == "ServiceProvider" ? "e.g. Ceylon Safari & Stays" : "e.g. Kasun Silva",
                      prefixIcon: Icon(selectedRole == "ServiceProvider" ? Icons.business : Icons.person_outline),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Extra fields for Service Provider
                  if (selectedRole == "ServiceProvider") ...[
                    TextField(
                      controller: phoneCtrl,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: "Business Contact Phone",
                        hintText: "+94 77 123 4567",
                        prefixIcon: Icon(Icons.phone_outlined),
                      ),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: selectedServiceType,
                      decoration: const InputDecoration(
                        labelText: "Primary Service Category",
                        prefixIcon: Icon(Icons.category_outlined),
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: "Accommodation & Dining",
                          child: Text("Accommodation & Dining"),
                        ),
                        DropdownMenuItem(
                          value: "Transport & Vehicle Rental",
                          child: Text("Transport & Vehicle Rental"),
                        ),
                        DropdownMenuItem(
                          value: "Tours & Attractions",
                          child: Text("Tours & Attractions"),
                        ),
                      ],
                      onChanged: (v) => setState(() => selectedServiceType = v ?? "Accommodation & Dining"),
                    ),
                    const SizedBox(height: 12),
                  ],
                ],

                // Email & Password Fields (Empty by default)
                TextField(
                  controller: emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: "Email Address",
                    hintText: "e.g. yourname@gmail.com",
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: passCtrl,
                  obscureText: obscurePassword,
                  decoration: InputDecoration(
                    labelText: "Password",
                    hintText: "Enter your password",
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(obscurePassword ? Icons.visibility_off : Icons.visibility),
                      onPressed: () => setState(() => obscurePassword = !obscurePassword),
                    ),
                  ),
                ),
                if (!isRegister) ...[
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () => _showForgotPasswordDialog(context),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                        visualDensity: VisualDensity.compact,
                      ),
                      child: const Text(
                        "Forgot Password?",
                        style: TextStyle(
                          color: AppTheme.primary,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ] else
                  const SizedBox(height: 16),

                // Submit Button
                FilledButton(
                  onPressed: busy ? null : _submit,
                  child: Text(
                    busy
                        ? "Please wait..."
                        : isRegister
                            ? "Complete Registration"
                            : "Sign In to TravelWise",
                  ),

                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}



  void _showForgotPasswordDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => _ForgotPasswordDialog(
        initialEmail: emailCtrl.text.trim(),
        onPasswordResetSuccess: (email) {
          setState(() {
            emailCtrl.text = email;
            passCtrl.clear();
            error = "Password successfully reset! Please sign in with your new password.";
          });
        },
      ),
    );
  }
}

class _ForgotPasswordDialog extends StatefulWidget {
  final String initialEmail;
  final ValueChanged<String> onPasswordResetSuccess;

  const _ForgotPasswordDialog({
    required this.initialEmail,
    required this.onPasswordResetSuccess,
  });

  @override
  State<_ForgotPasswordDialog> createState() => _ForgotPasswordDialogState();
}

class _ForgotPasswordDialogState extends State<_ForgotPasswordDialog> {
  final api = ApiService();
  late final TextEditingController emailCtrl;
  final tokenCtrl = TextEditingController();
  final newPassCtrl = TextEditingController();

  int step = 1; // 1: Request token, 2: Reset password
  bool busy = false;
  String? error;
  String? success;
  bool obscureNewPassword = true;

  @override
  void initState() {
    super.initState();
    emailCtrl = TextEditingController(text: widget.initialEmail);
  }

  @override
  void dispose() {
    emailCtrl.dispose();
    tokenCtrl.dispose();
    newPassCtrl.dispose();
    super.dispose();
  }

  Future<void> _requestToken() async {
    final email = emailCtrl.text.trim();
    if (email.isEmpty) {
      setState(() => error = "Please enter your email address.");
      return;
    }

    setState(() {
      busy = true;
      error = null;
      success = null;
    });

    try {
      final res = await api.forgotPassword(email);
      final token = res['resetToken']?.toString();
      final emailSent = res['emailSent'] == true;

      setState(() {
        busy = false;
        step = 2;
        if (token != null && token.isNotEmpty) {
          tokenCtrl.text = token;
        }
        success = emailSent
            ? "Reset link sent! We have pre-filled your reset token below."
            : "Reset token generated! Enter your new password below.";
      });
    } catch (e) {
      setState(() {
        busy = false;
        error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _resetPassword() async {
    final email = emailCtrl.text.trim();
    final token = tokenCtrl.text.trim();
    final newPassword = newPassCtrl.text;

    if (email.isEmpty || token.isEmpty || newPassword.isEmpty) {
      setState(() => error = "All fields are required.");
      return;
    }
    if (newPassword.length < 6) {
      setState(() => error = "Password must be at least 6 characters.");
      return;
    }

    setState(() {
      busy = true;
      error = null;
      success = null;
    });

    try {
      await api.resetPassword(
        email: email,
        token: token,
        newPassword: newPassword,
      );
      if (mounted) {
        Navigator.of(context).pop();
        widget.onPasswordResetSuccess(email);
      }
    } catch (e) {
      setState(() {
        busy = false;
        error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    step == 1 ? Icons.lock_reset : Icons.vpn_key,
                    size: 32,
                    color: AppTheme.primary,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                step == 1 ? "Forgot Password" : "Set New Password",
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryDark,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                step == 1
                    ? "Enter your email to receive a password reset token."
                    : "Enter the reset token and choose a new password.",
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
              ),
              const SizedBox(height: 16),
              if (error != null)
                Container(
                  padding: const EdgeInsets.all(10),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFFECACA)),
                  ),
                  child: Text(
                    error!,
                    style: const TextStyle(color: AppTheme.danger, fontSize: 12),
                  ),
                ),
              if (success != null)
                Container(
                  padding: const EdgeInsets.all(10),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFA7F3D0)),
                  ),
                  child: Text(
                    success!,
                    style: const TextStyle(color: Color(0xFF065F46), fontSize: 12),
                  ),
                ),
              if (step == 1) ...[
                TextField(
                  controller: emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: "Email Address",
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: busy ? null : _requestToken,
                  child: Text(busy ? "Sending..." : "Send Reset Link"),
                ),
                TextButton(
                  onPressed: () => setState(() {
                    step = 2;
                    error = null;
                    success = null;
                  }),
                  child: const Text(
                    "I already have a reset token →",
                    style: TextStyle(fontSize: 12),
                  ),
                ),
              ] else ...[
                TextField(
                  controller: emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: "Email Address",
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: tokenCtrl,
                  decoration: const InputDecoration(
                    labelText: "Reset Token",
                    prefixIcon: Icon(Icons.pin),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: newPassCtrl,
                  obscureText: obscureNewPassword,
                  decoration: InputDecoration(
                    labelText: "New Password",
                    hintText: "Min. 6 characters",
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(obscureNewPassword
                          ? Icons.visibility_off
                          : Icons.visibility),
                      onPressed: () =>
                          setState(() => obscureNewPassword = !obscureNewPassword),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: busy ? null : _resetPassword,
                  child: Text(busy ? "Resetting..." : "Reset Password"),
                ),
                TextButton(
                  onPressed: () => setState(() {
                    step = 1;
                    error = null;
                    success = null;
                  }),
                  child: const Text("← Back to request token",
                      style: TextStyle(fontSize: 12)),
                ),
              ],
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text("Cancel", style: TextStyle(color: AppTheme.textMuted)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

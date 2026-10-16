import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/travel_background.dart';
import 'settlement_screen.dart';
import 'transport_screen.dart';

class DashboardScreen extends StatefulWidget {
  final Function(String destination, String name)? onPlanTrip;
  final VoidCallback? onOpenWeather;

  const DashboardScreen({
    this.onPlanTrip,
    this.onOpenWeather,
    super.key,
  });

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final api = ApiService();

  Map<String, dynamic>? currentUser;
  List<dynamic> trips = [];
  bool loading = true;

  // Quick Planner Bar State
  String quickDest = "Ella";
  DateTime quickStartDate = DateTime.now();
  DateTime quickEndDate = DateTime.now().add(const Duration(days: 3));
  int quickTravelers = 2;

  final List<String> popularDestinations = [
    "Ella",
    "Sigiriya",
    "Mirissa",
    "Kandy",
    "Nuwara Eliya",
    "Galle",
    "Yala",
    "Colombo",
    "Arugam Bay",
    "Trincomalee",
  ];

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    try {
      final user = await api.getCurrentUser();
      final tripsList = await api.getTrips();
      if (mounted) {
        setState(() {
          currentUser = user;
          trips = tripsList;
          loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => loading = false);
    }
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  void _triggerPlan(String destination, String name) {
    if (widget.onPlanTrip != null) {
      widget.onPlanTrip!(destination, name);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary = isDark ? AppTheme.darkTextMain : AppTheme.lightTextMain;
    final textMuted = isDark ? AppTheme.darkTextMuted : AppTheme.lightTextMuted;

    final userName = currentUser?['displayName']?.toString().isNotEmpty == true
        ? currentUser!['displayName']
        : currentUser?['email']?.toString().split('@').first ?? "traveller";

    return Scaffold(
      backgroundColor: isDark ? AppTheme.darkBackground : AppTheme.lightBackground,
      body: TravelBackground(
        child: SafeArea(
          child: RefreshIndicator(
            onRefresh: _loadDashboardData,
            color: AppTheme.primary,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. TOP HEADER GREETING, ROLE & THEME TOGGLE
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "${_getGreeting()}, $userName",
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: textPrimary,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: Color(0xFF22C55E),
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                api.isCloud
                                    ? "Logged in as Traveller • Render Cloud Live"
                                    : "Logged in as Traveller • Live API Connected",
                                style: TextStyle(
                                  fontSize: 11.5,
                                  color: textMuted,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Row(
                      children: [
                        // Light / Dark Theme Switch Button
                        IconButton.filledTonal(
                          style: IconButton.styleFrom(
                            backgroundColor: isDark
                                ? const Color(0xFF334155)
                                : const Color(0xFFE2E8F0),
                          ),
                          onPressed: () => ThemeManager.toggleTheme(),
                          icon: Icon(
                            isDark ? Icons.light_mode : Icons.dark_mode_outlined,
                            size: 19,
                            color: isDark ? const Color(0xFFFBBF24) : const Color(0xFF0F766E),
                          ),
                          tooltip: isDark ? "Switch to Light Mode" : "Switch to Dark Mode",
                        ),
                        const SizedBox(width: 8),
                        CircleAvatar(
                          radius: 19,
                          backgroundColor: AppTheme.primary.withValues(alpha: 0.15),
                          child: Text(
                            userName.isNotEmpty ? userName[0].toUpperCase() : "T",
                            style: const TextStyle(
                              color: AppTheme.primary,
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                // 2. SCENIC HERO BANNER (COASTAL & GOLDEN SRI LANKA)
                _buildHeroBanner(),

                const SizedBox(height: 20),

                // 3. QUICK PLANNER BAR (CLEAN, PROPERLY ALIGNED)
                _buildQuickPlannerBar(isDark),

                const SizedBox(height: 20),

                // 4. STATS SUMMARY OVERVIEW
                _buildStatsOverview(isDark),

                const SizedBox(height: 20),

                // 5. LIVE DESTINATION WEATHER RADAR
                _buildWeatherRadarSection(isDark, textPrimary, textMuted),

                const SizedBox(height: 20),

                // 6. QUICK SERVICES & TOOLS
                _buildQuickActionCards(isDark, textPrimary, textMuted),

                const SizedBox(height: 28),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

  // --- WIDGET BUILDERS ---

  Widget _buildHeroBanner() {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.primary.withValues(alpha: 0.25)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          // Background Image
          Positioned.fill(
            child: Image.asset(
              'assets/images/sigiriya-golden.jpg',
              fit: BoxFit.cover,
            ),
          ),
          // Dark Luxury Gradient Wash
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    const Color(0xFF061824).withValues(alpha: 0.92),
                    const Color(0xFF0A2333).withValues(alpha: 0.78),
                    const Color(0xFF0F384C).withValues(alpha: 0.88),
                  ],
                ),
              ),
            ),
          ),
          // Content
          Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  "MOUNTAINS • PLAINS • BEACHES • HILL COUNTRY",
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFFFBBF24),
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  "Spend your vacation with our curated activities",
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: -0.3,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 14),
                const Text(
                  "MOST POPULAR ESCAPES",
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF5EEAD4),
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 10),
                // Popular Escape Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildEscapeChip(
                        title: "Trip To Ella",
                        travelers: "31 active",
                        imagePath: "assets/images/wildlife-peacock.jpg",
                        destination: "Ella",
                      ),
                      const SizedBox(width: 10),
                      _buildEscapeChip(
                        title: "Trip To Sigiriya",
                        travelers: "27 active",
                        imagePath: "assets/images/sigiriya-aerial.jpg",
                        destination: "Sigiriya",
                      ),
                      const SizedBox(width: 10),
                      _buildEscapeChip(
                        title: "Trip To Mirissa",
                        travelers: "20 active",
                        imagePath: "assets/images/beach-resort.jpg",
                        destination: "Mirissa",
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEscapeChip({
    required String title,
    required String travelers,
    required String imagePath,
    required String destination,
  }) {
    return InkWell(
      onTap: () => _triggerPlan(destination, "$destination Getaway"),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 160,
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: const Color(0xFF0F2230).withValues(alpha: 0.9),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.asset(
                imagePath,
                height: 82,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "👥 $travelers",
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF94A3B8),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.25),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.arrow_forward_ios,
                    size: 9,
                    color: Color(0xFF5EEAD4),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickPlannerBar(bool isDark) {
    final cardBg = isDark ? const Color(0xFF1E293B) : Colors.white;
    final borderColor = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);
    final fieldBg = isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC);
    final textCol = isDark ? Colors.white : const Color(0xFF0F172A);
    final labelCol = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section Title
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.flight_takeoff, color: AppTheme.primary, size: 18),
              ),
              const SizedBox(width: 10),
              Text(
                "Quick Trip Planner",
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: textCol,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // 1. Destination Field
          Text(
            "DESTINATION",
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: labelCol,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: fieldBg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: borderColor),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: quickDest,
                isExpanded: true,
                dropdownColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                icon: const Icon(Icons.keyboard_arrow_down, color: AppTheme.primary),
                items: popularDestinations
                    .map((d) => DropdownMenuItem(
                          value: d,
                          child: Row(
                            children: [
                              const Icon(Icons.location_on_outlined, color: AppTheme.primary, size: 18),
                              const SizedBox(width: 8),
                              Text(
                                d,
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14,
                                  color: textCol,
                                ),
                              ),
                            ],
                          ),
                        ))
                    .toList(),
                onChanged: (val) {
                  if (val != null) setState(() => quickDest = val);
                },
              ),
            ),
          ),
          const SizedBox(height: 14),

          // 2. Dates Row (Check-in & Check-out)
          Row(
            children: [
              // Check-in
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "CHECK-IN",
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: labelCol,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    InkWell(
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: quickStartDate,
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(const Duration(days: 365)),
                        );
                        if (picked != null) {
                          setState(() {
                            quickStartDate = picked;
                            if (quickEndDate.isBefore(picked)) {
                              quickEndDate = picked.add(const Duration(days: 2));
                            }
                          });
                        }
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 13),
                        decoration: BoxDecoration(
                          color: fieldBg,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: borderColor),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.calendar_today_outlined, size: 16, color: AppTheme.primary),
                            const SizedBox(width: 8),
                            Text(
                              "${quickStartDate.year}-${quickStartDate.month.toString().padLeft(2, '0')}-${quickStartDate.day.toString().padLeft(2, '0')}",
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: textCol,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              // Check-out
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "CHECK-OUT",
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: labelCol,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    InkWell(
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: quickEndDate,
                          firstDate: quickStartDate,
                          lastDate: DateTime.now().add(const Duration(days: 365)),
                        );
                        if (picked != null) setState(() => quickEndDate = picked);
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 13),
                        decoration: BoxDecoration(
                          color: fieldBg,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: borderColor),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.event_outlined, size: 16, color: AppTheme.primary),
                            const SizedBox(width: 8),
                            Text(
                              "${quickEndDate.year}-${quickEndDate.month.toString().padLeft(2, '0')}-${quickEndDate.day.toString().padLeft(2, '0')}",
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: textCol,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // 3. Guests Counter & Plan My Trip Button
          Row(
            children: [
              // Guests Counter
              Container(
                height: 46,
                padding: const EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(
                  color: fieldBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: borderColor),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.people_outline, size: 16, color: labelCol),
                    const SizedBox(width: 6),
                    Text(
                      "$quickTravelers",
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: textCol,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      quickTravelers == 1 ? "Guest" : "Guests",
                      style: TextStyle(fontSize: 12, color: labelCol),
                    ),
                    const SizedBox(width: 6),
                    // Decrement
                    InkWell(
                      onTap: () {
                        if (quickTravelers > 1) {
                          setState(() => quickTravelers--);
                        }
                      },
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Icon(Icons.remove, size: 13, color: textCol),
                      ),
                    ),
                    const SizedBox(width: 4),
                    // Increment
                    InkWell(
                      onTap: () => setState(() => quickTravelers++),
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Icon(Icons.add, size: 13, color: textCol),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              // Plan My Trip Button
              Expanded(
                child: SizedBox(
                  height: 46,
                  child: FilledButton.icon(
                    onPressed: () => _triggerPlan(quickDest, "$quickDest Adventure"),
                    icon: const Icon(Icons.auto_awesome, size: 16),
                    label: const Text(
                      "Plan My Trip",
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                    ),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFFF59E0B),
                      foregroundColor: const Color(0xFF1E1B4B),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatsOverview(bool isDark) {
    final activeCount = trips.where((t) => t['status'] != 'Completed').length;
    final cardBg = isDark ? const Color(0xFF1E293B) : Colors.white;
    final borderColor = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);
    final labelCol = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

    return Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: borderColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      "Total Trips",
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: labelCol),
                    ),
                    const Icon(Icons.luggage_outlined, size: 18, color: AppTheme.primary),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  "${trips.length}",
                  style: const TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.primary,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: borderColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      "Active Adventures",
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: labelCol),
                    ),
                    const Icon(Icons.explore_outlined, size: 18, color: Color(0xFF16A34A)),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  "$activeCount",
                  style: const TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF16A34A),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildWeatherRadarSection(bool isDark, Color textPrimary, Color textMuted) {
    final cardBg = isDark ? const Color(0xFF1E293B) : Colors.white;
    final borderColor = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);

    final sampleDestinations = [
      {"name": "Sigiriya", "temp": "28°C", "condition": "Partly Cloudy", "icon": "🌤️"},
      {"name": "Ella", "temp": "21°C", "condition": "Mild Mist", "icon": "🌫️"},
      {"name": "Mirissa", "temp": "30°C", "condition": "Sunny Beach", "icon": "☀️"},
      {"name": "Kandy", "temp": "24°C", "condition": "Scattered Clouds", "icon": "⛅"},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              "Destination Weather Radar",
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: textPrimary,
              ),
            ),
            if (widget.onOpenWeather != null)
              TextButton(
                onPressed: widget.onOpenWeather,
                child: const Text("View All Radar →", style: TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.w700)),
              ),
          ],
        ),
        const SizedBox(height: 10),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: sampleDestinations.map((w) {
              return Container(
                width: 140,
                margin: const EdgeInsets.only(right: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: borderColor),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(w['icon']!, style: const TextStyle(fontSize: 22)),
                        Text(
                          w['temp']!,
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 15,
                            color: textPrimary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      w['name']!,
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      w['condition']!,
                      style: TextStyle(fontSize: 11, color: textMuted),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActionCards(bool isDark, Color textPrimary, Color textMuted) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Quick Services & Tools",
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildActionTile(
                isDark: isDark,
                textPrimary: textPrimary,
                textMuted: textMuted,
                icon: Icons.account_balance_wallet_outlined,
                title: "Debt Settlement",
                subtitle: "Fair group splits",
                color: const Color(0xFFF59E0B),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const SettlementScreen()),
                  );
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionTile(
                isDark: isDark,
                textPrimary: textPrimary,
                textMuted: textMuted,
                icon: Icons.directions_subway_outlined,
                title: "Transit & Fares",
                subtitle: "Train & bus rates",
                color: const Color(0xFF0EA5E9),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const TransportScreen()),
                  );
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildActionTile({
    required bool isDark,
    required Color textPrimary,
    required Color textMuted,
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    final cardBg = isDark ? const Color(0xFF1E293B) : Colors.white;
    final borderColor = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: borderColor),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w700,
                color: textPrimary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: TextStyle(fontSize: 11, color: textMuted),
            ),
          ],
        ),
      ),
    );
  }
}

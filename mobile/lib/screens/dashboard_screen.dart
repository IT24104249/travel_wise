import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
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
    final userName = currentUser?['displayName']?.toString().isNotEmpty == true
        ? currentUser!['displayName']
        : currentUser?['email']?.toString().split('@').first ?? "traveller";

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadDashboardData,
          color: AppTheme.primary,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. TOP HEADER GREETING & ROLE
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "${_getGreeting()}, $userName",
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
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
                            const Text(
                              "Logged in as Traveller • Connected to API",
                              style: TextStyle(
                                fontSize: 11,
                                color: AppTheme.textSecondary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: AppTheme.primary.withOpacity(0.2),
                      child: Text(
                        userName.isNotEmpty ? userName[0].toUpperCase() : "T",
                        style: const TextStyle(
                          color: AppTheme.primary,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // 2. SCENIC HERO BANNER (COASTAL & GOLDEN SRI LANKA)
                _buildHeroBanner(),

                const SizedBox(height: 24),

                // 3. QUICK PLANNER BAR (MATCHING WEB BAR)
                _buildQuickPlannerBar(),

                const SizedBox(height: 24),

                // 4. STATS SUMMARY OVERVIEW
                _buildStatsOverview(),

                const SizedBox(height: 24),

                // 5. LIVE DESTINATION WEATHER RADAR
                _buildWeatherRadarSection(),

                const SizedBox(height: 24),

                // 6. QUICK ACTIONS (DEBT SETTLEMENT & TRANSIT)
                _buildQuickActionCards(),

                const SizedBox(height: 32),
              ],
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
        border: Border.all(color: AppTheme.primary.withOpacity(0.3)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.4),
            blurRadius: 20,
            offset: const Offset(0, 10),
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
                    const Color(0xFF061824).withOpacity(0.92),
                    const Color(0xFF0A2333).withOpacity(0.75),
                    const Color(0xFF0F384C).withOpacity(0.85),
                  ],
                ),
              ),
            ),
          ),
          // Content
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  "MOUNTAINS • PLAINS • BEACHES • HILL COUNTRY",
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFFFBBF24),
                    letterSpacing: 2.0,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  "Spend your vacation with our curated activities",
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  "Plan unforgettable group journeys across Sri Lanka with multi-agent AI itinerary creation and real-time safety radars.",
                  style: TextStyle(
                    fontSize: 12,
                    color: Color(0xFFC5D8DE),
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  "MOST POPULAR ESCAPES",
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.primary,
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
                      const SizedBox(width: 12),
                      _buildEscapeChip(
                        title: "Trip To Sigiriya",
                        travelers: "27 active",
                        imagePath: "assets/images/sigiriya-aerial.jpg",
                        destination: "Sigiriya",
                      ),
                      const SizedBox(width: 12),
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
      borderRadius: BorderRadius.circular(14),
      child: Container(
        width: 170,
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: const Color(0xFF0F2230).withOpacity(0.9),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Image.asset(
                imagePath,
                height: 90,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: const TextStyle(
                fontSize: 13,
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
                    color: AppTheme.textSecondary,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.arrow_forward_ios,
                    size: 9,
                    color: AppTheme.primary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickPlannerBar() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.cardBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.flight_takeoff, color: AppTheme.primary, size: 18),
              SizedBox(width: 8),
              Text(
                "Quick Trip Planner",
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Destination Dropdown
          DropdownButtonFormField<String>(
            value: quickDest,
            dropdownColor: AppTheme.cardBackground,
            decoration: const InputDecoration(
              labelText: "Destination",
              prefixIcon: Icon(Icons.location_on_outlined, color: AppTheme.primary),
            ),
            items: popularDestinations
                .map((d) => DropdownMenuItem(value: d, child: Text(d)))
                .toList(),
            onChanged: (val) {
              if (val != null) setState(() => quickDest = val);
            },
          ),
          const SizedBox(height: 12),

          // Dates Row
          Row(
            children: [
              Expanded(
                child: InkWell(
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
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      labelText: "Check-in",
                      prefixIcon: Icon(Icons.calendar_today, size: 16),
                    ),
                    child: Text(
                      "${quickStartDate.year}-${quickStartDate.month.toString().padLeft(2, '0')}-${quickStartDate.day.toString().padLeft(2, '0')}",
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: quickEndDate,
                      firstDate: quickStartDate,
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (picked != null) setState(() => quickEndDate = picked);
                  },
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      labelText: "Check-out",
                      prefixIcon: Icon(Icons.calendar_month, size: 16),
                    ),
                    child: Text(
                      "${quickEndDate.year}-${quickEndDate.month.toString().padLeft(2, '0')}-${quickEndDate.day.toString().padLeft(2, '0')}",
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Travelers Counter & Plan Button
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.white.withOpacity(0.08)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.people_outline, size: 16, color: AppTheme.textSecondary),
                    const SizedBox(width: 6),
                    Text(
                      "$quickTravelers Guests",
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(width: 4),
                    IconButton(
                      icon: const Icon(Icons.remove, size: 14),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: () {
                        if (quickTravelers > 1) {
                          setState(() => quickTravelers--);
                        }
                      },
                    ),
                    const SizedBox(width: 6),
                    IconButton(
                      icon: const Icon(Icons.add, size: 14),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: () => setState(() => quickTravelers++),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton.icon(
                  onPressed: () => _triggerPlan(quickDest, "$quickDest Adventure"),
                  icon: const Icon(Icons.auto_awesome, size: 16),
                  label: const Text("Plan My Trip", style: TextStyle(fontWeight: FontWeight.w700)),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFFF59E0B),
                    foregroundColor: const Color(0xFF0F172A),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatsOverview() {
    final activeCount = trips.where((t) => t['status'] != 'Completed').length;
    return Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.cardBackground,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.white.withOpacity(0.06)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Total Trips", style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                const SizedBox(height: 6),
                Text(
                  "${trips.length}",
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppTheme.primary),
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
              color: AppTheme.cardBackground,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.white.withOpacity(0.06)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Active Adventures", style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                const SizedBox(height: 6),
                Text(
                  "$activeCount",
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Color(0xFF22C55E)),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildWeatherRadarSection() {
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
            const Text(
              "Destination Weather Radar",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
            ),
            if (widget.onOpenWeather != null)
              TextButton(
                onPressed: widget.onOpenWeather,
                child: const Text("View All Radar →", style: TextStyle(color: AppTheme.primary, fontSize: 12)),
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
                  color: AppTheme.cardBackground,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withOpacity(0.06)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(w['icon']!, style: const TextStyle(fontSize: 20)),
                        Text(w['temp']!, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Colors.white)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(w['name']!, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Colors.white)),
                    const SizedBox(height: 2),
                    Text(w['condition']!, style: const TextStyle(fontSize: 10.5, color: AppTheme.textSecondary)),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActionCards() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          "Quick Services & Tools",
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildActionTile(
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
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.cardBackground,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 10),
            Text(
              title,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}

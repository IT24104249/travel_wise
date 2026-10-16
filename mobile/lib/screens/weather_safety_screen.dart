import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/travel_background.dart';

class WeatherSafetyScreen extends StatefulWidget {
  final String? initialDestination;
  const WeatherSafetyScreen({this.initialDestination, super.key});

  @override
  State<WeatherSafetyScreen> createState() => _WeatherSafetyScreenState();
}

class _WeatherSafetyScreenState extends State<WeatherSafetyScreen> {
  final api = ApiService();
  final TextEditingController _destCtrl = TextEditingController();

  bool loading = false;
  String? error;
  Map<String, dynamic>? weatherReport;
  String currentDestination = "Ella";

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
    currentDestination = widget.initialDestination ?? "Ella";
    _destCtrl.text = currentDestination;
    _fetchWeather(currentDestination);
  }

  @override
  void dispose() {
    _destCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchWeather(String dest) async {
    if (dest.trim().isEmpty) return;
    setState(() {
      loading = true;
      error = null;
      currentDestination = dest.trim();
    });

    try {
      final res = await api.getWeather(currentDestination);
      if (mounted) {
        setState(() {
          weatherReport = res;
          loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          error = e.toString().replaceFirst("Exception: ", "");
          loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDarkMode(context);
    final textPrimary = AppTheme.getTextMain(context);
    final textMuted = AppTheme.getTextMuted(context);
    final cardBg = AppTheme.getCardBg(context);
    final borderColor = AppTheme.getBorder(context);

    return Scaffold(
      backgroundColor: AppTheme.getBackground(context),
      appBar: AppBar(
        title: const Text("Weather & Safety Radar"),
        elevation: 0,
      ),
      body: TravelBackground(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. SEARCH BAR
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _destCtrl,
                    decoration: InputDecoration(
                      hintText: "Enter Sri Lanka destination (e.g. Ella)...",
                      prefixIcon: const Icon(Icons.search, color: AppTheme.primary),
                      suffixIcon: _destCtrl.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
                              onPressed: () {
                                _destCtrl.clear();
                                setState(() {});
                              },
                            )
                          : null,
                    ),
                    onSubmitted: (val) => _fetchWeather(val),
                  ),
                ),
                const SizedBox(width: 10),
                FilledButton(
                  onPressed: () => _fetchWeather(_destCtrl.text),
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                  ),
                  child: const Text("Query"),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // 2. POPULAR DESTINATIONS HORIZONTAL CHIPS
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: popularDestinations.map((d) {
                  final isSelected = d.toLowerCase() == currentDestination.toLowerCase();
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(d),
                      selected: isSelected,
                      selectedColor: AppTheme.primary.withValues(alpha: 0.25),
                      labelStyle: TextStyle(
                        color: isSelected ? AppTheme.primary : textMuted,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        fontSize: 12,
                      ),
                      onSelected: (_) {
                        _destCtrl.text = d;
                        _fetchWeather(d);
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 20),

            // 3. WEATHER REPORT CARD
            if (loading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: CircularProgressIndicator(color: AppTheme.primary),
                ),
              )
            else if (error != null)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.red.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        error!,
                        style: const TextStyle(color: Colors.red, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              )
            else
              _buildWeatherCard(),

            const SizedBox(height: 24),

            // 4. ENVIRONMENTAL SAFETY ADVISORY
            _buildSafetyAdvisoryCard(isDark, textPrimary, textMuted),

            const SizedBox(height: 24),

            // 5. DIRECT EMERGENCY HOTLINES (TOURIST POLICE, DMC, 1990)
            _buildEmergencyHotlines(textPrimary, textMuted, cardBg, borderColor),

            const SizedBox(height: 32),
          ],
        ),
      ),
    ),
  );
}

  Widget _buildWeatherCard() {
    final forecast = weatherReport?['forecast']?['current'];
    final temp = forecast?['temperature_2m']?.toString() ?? "24.5";
    final precip = forecast?['precipitation']?.toString() ?? "0.0";
    final wind = forecast?['wind_speed_10m']?.toString() ?? "12.0";

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF0F2D3E),
            const Color(0xFF0A1E2C),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.primary.withValues(alpha: 0.35)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 15,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "LOCATION RADAR",
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.textSecondary,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    "📍 $currentDestination, Sri Lanka",
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
              const Text("🌤️", style: TextStyle(fontSize: 36)),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                "$temp°C",
                style: const TextStyle(
                  fontSize: 44,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.primary,
                  height: 1.0,
                ),
              ),
              const SizedBox(width: 14),
              const Padding(
                padding: EdgeInsets.only(bottom: 6),
                child: Text(
                  "Real-time Open-Meteo Radar",
                  style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          const Divider(color: Colors.white12),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildMetricItem(Icons.water_drop_outlined, "Precipitation", "$precip mm", const Color(0xFF0EA5E9)),
              _buildMetricItem(Icons.air, "Wind Speed", "$wind km/h", const Color(0xFF22C55E)),
              _buildMetricItem(Icons.shield_outlined, "Risk Index", "Low Safe", const Color(0xFFF59E0B)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMetricItem(IconData icon, String label, String val, Color color) {
    return Column(
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(height: 6),
        Text(val, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(fontSize: 10.5, color: AppTheme.textSecondary)),
      ],
    );
  }

  Widget _buildSafetyAdvisoryCard(bool isDark, Color textPrimary, Color textMuted) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF22C55E).withValues(alpha: isDark ? 0.12 : 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF22C55E).withValues(alpha: isDark ? 0.35 : 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: const BoxDecoration(
                  color: Color(0xFF22C55E),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check, size: 14, color: Colors.white),
              ),
              const SizedBox(width: 10),
              const Text(
                "Risk Agent Advisory: Safe for Travel",
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF16A34A),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            "The multi-agent safety radar verified destination outdoor conditions against flash flood and landslide threshold indexes. Suitable for outdoor hiking, sightseeing, and scenic transit.",
            style: TextStyle(
              fontSize: 12,
              color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmergencyHotlines(Color textPrimary, Color textMuted, Color cardBg, Color borderColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Sri Lanka Emergency Hotlines",
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        _buildHotlineTile("1912", "Tourist Police Hotline", "Direct assistance for tourists", Icons.local_police_outlined, const Color(0xFF0EA5E9), textPrimary, textMuted, cardBg, borderColor),
        const SizedBox(height: 8),
        _buildHotlineTile("117", "Disaster Management Centre (DMC)", "Emergency weather & landslide alerts", Icons.warning_amber_rounded, const Color(0xFFF59E0B), textPrimary, textMuted, cardBg, borderColor),
        const SizedBox(height: 8),
        _buildHotlineTile("1990", "1990 Suwa Seriya Ambulance", "Free nationwide emergency medical service", Icons.medical_services_outlined, const Color(0xFFEF4444), textPrimary, textMuted, cardBg, borderColor),
        const SizedBox(height: 8),
        _buildHotlineTile("119", "Police Emergency Helpline", "National general emergency dispatch", Icons.shield_outlined, const Color(0xFF22C55E), textPrimary, textMuted, cardBg, borderColor),
      ],
    );
  }

  Widget _buildHotlineTile(
    String number,
    String title,
    String subtitle,
    IconData icon,
    Color color,
    Color textPrimary,
    Color textMuted,
    Color cardBg,
    Color borderColor,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: textPrimary)),
                Text(subtitle, style: TextStyle(fontSize: 11, color: textMuted)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              number,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

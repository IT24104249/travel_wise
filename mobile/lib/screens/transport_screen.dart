import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class TransportScreen extends StatelessWidget {
  const TransportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Row(
            children: const [
              Icon(Icons.directions_subway, color: AppTheme.primary),
              SizedBox(width: 8),
              Text("Transit & Rental Vehicles"),
            ],
          ),
          bottom: const TabBar(
            labelColor: AppTheme.primary,
            indicatorColor: AppTheme.primary,
            unselectedLabelColor: AppTheme.textMuted,
            tabs: [
              Tab(icon: Icon(Icons.train), text: "Train Routes & Fares"),
              Tab(icon: Icon(Icons.directions_car), text: "Rental Vehicles"),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _buildTrainsTab(),
            _buildVehiclesTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildTrainsTab() {
    final routes = [
      {
        "name": "Kandy to Ella (Scenic Mountain Express)",
        "desc": "Rated the world's most scenic train ride passing tea valleys, St. Clair waterfalls, and mist-clad mountain viaducts.",
        "duration": "6h 45m",
        "firstClass": "3,000 LKR (Reserved AC)",
        "secondClass": "1,800 LKR",
        "thirdClass": "900 LKR",
        "icon": Icons.terrain,
      },
      {
        "name": "Colombo Fort to Kandy (Intercity)",
        "desc": "Climbs from the western plains into the hill country capital, ideal for visiting the Temple of the Tooth and Peradeniya Gardens.",
        "duration": "2h 30m",
        "firstClass": "2,200 LKR (AC Observation)",
        "secondClass": "1,200 LKR",
        "thirdClass": "600 LKR",
        "icon": Icons.location_city,
      },
      {
        "name": "Colombo to Galle & Matara (Coastal Line)",
        "desc": "Hugs the southwest Indian Ocean coastline mere meters from the beach waves, passing Bentota, Hikkaduwa, and Galle Fort.",
        "duration": "2h 15m",
        "firstClass": "1,800 LKR",
        "secondClass": "1,000 LKR",
        "thirdClass": "500 LKR",
        "icon": Icons.beach_access,
      },
      {
        "name": "Colombo to Anuradhapura & Jaffna (Yal Devi)",
        "desc": "Traverses north across the dry zone into the ancient sacred cities and vibrant northern Tamil cultural hub of Jaffna.",
        "duration": "6h 30m",
        "firstClass": "3,200 LKR (Sleeper AC)",
        "secondClass": "1,900 LKR",
        "thirdClass": "950 LKR",
        "icon": Icons.temple_buddhist,
      },
    ];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFEFF6FF),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFBFDBFE)),
          ),
          child: Row(
            children: const [
              Icon(Icons.info, color: Color(0xFF2563EB)),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  "Official Sri Lanka Railways fares. Reserved 1st Class observation seats open 30 days in advance.",
                  style: TextStyle(fontSize: 12, color: Color(0xFF1E40AF)),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        ...routes.map((r) => Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: const Color(0xFFE0F2FE),
                          child: Icon(r['icon'] as IconData, color: const Color(0xFF0284C7)),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            r['name'] as String,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                        ),
                        Chip(
                          label: Text(r['duration'] as String, style: const TextStyle(fontSize: 11)),
                          backgroundColor: Colors.grey.shade100,
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(r['desc'] as String, style: const TextStyle(fontSize: 13, color: Color(0xFF475569))),
                    const Divider(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildFareBadge("1st Class", r['firstClass'] as String, Colors.purple),
                        _buildFareBadge("2nd Class", r['secondClass'] as String, AppTheme.primary),
                        _buildFareBadge("3rd Class", r['thirdClass'] as String, Colors.blueGrey),
                      ],
                    ),
                  ],
                ),
              ),
            )),
      ],
    );
  }

  Widget _buildFareBadge(String label, String price, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.bold)),
        Text(price, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
      ],
    );
  }

  Widget _buildVehiclesTab() {
    final vehicles = [
      {
        "title": "Toyota HiAce KDH Van (9-12 Seater)",
        "type": "Family & Group Tours",
        "rate": "16,000 LKR / day (~ \$53 USD)",
        "perKm": "110 LKR / km",
        "features": "Dual AC, High Roof, Luggage Space, Experienced English Driver",
        "icon": Icons.airport_shuttle,
      },
      {
        "title": "Toyota Prius / Axio Hybrid Sedan",
        "type": "Couples & Small Families",
        "rate": "11,500 LKR / day (~ \$38 USD)",
        "perKm": "85 LKR / km",
        "features": "Full AC, Fuel Efficient, Comfortable Highway Ride",
        "icon": Icons.directions_car,
      },
      {
        "title": "Bajaj 4-Stroke Tourist Tuk-Tuk",
        "type": "Adventure & Local Hopping",
        "rate": "4,500 LKR / day (~ \$15 USD)",
        "perKm": "50 LKR / km",
        "features": "Open Breeze, Surf Rack Option, Drive Yourself or with Driver",
        "icon": Icons.electric_rickshaw,
      },
      {
        "title": "Honda Navi / Yamaha Ray Scooter",
        "type": "Coastal & Beach Cruising",
        "rate": "2,500 LKR / day (~ \$8 USD)",
        "perKm": "Unlimited Mileage",
        "features": "Automatic, Helmets included, Perfect for Mirissa & Arugam Bay",
        "icon": Icons.two_wheeler,
      },
    ];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ...vehicles.map((v) => Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: const Color(0xFFFEF3C7),
                          child: Icon(v['icon'] as IconData, color: const Color(0xFFD97706)),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(v['title'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              Text(v['type'] as String, style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text("Daily Rental Rate", style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                              Text(v['rate'] as String, style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryDark)),
                            ],
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              const Text("Per-km Cost", style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                              Text(v['perKm'] as String, style: const TextStyle(fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      "Features: ${v['features']}",
                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
            )),
      ],
    );
  }
}

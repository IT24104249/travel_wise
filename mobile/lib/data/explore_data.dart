class Attraction {
  final String name;
  final String destination;
  final String category;
  final String description;
  final String imageUrl;
  final double feeLkr;
  final double rating;
  final String tip;

  const Attraction({
    required this.name,
    required this.destination,
    required this.category,
    required this.description,
    required this.imageUrl,
    required this.feeLkr,
    required this.rating,
    required this.tip,
  });
}

const List<Attraction> sriLankaAttractions = [
  Attraction(
    name: "Sigiriya Lion Rock Fortress",
    destination: "Sigiriya, Central Province",
    category: "Historical Ruins",
    description: "Rising 200m above dense jungle, Sigiriya is an ancient 5th-century citadel built by King Kashyapa with celestial maiden frescoes, mirror wall, and colossal lion paws.",
    imageUrl: "assets/images/sigiriya-golden.jpg",
    feeLkr: 11000.0,
    rating: 4.9,
    tip: "Start climb by 6:30 AM to beat the mid-day tropical heat and peak tourist crowds.",
  ),
  Attraction(
    name: "Saman Villas & Bentota Coastal Cliff",
    destination: "Bentota, Southern Province",
    category: "Beaches & Coastal",
    description: "Perched atop a rugged rocky headland overlooking the azure Indian Ocean and pristine golden beaches, offering world-class tropical sunset infinity pools.",
    imageUrl: "assets/images/beach-resort.jpg",
    feeLkr: 0.0,
    rating: 4.9,
    tip: "Perfect sunset vantage point with ocean breeze between 5:30 PM and 6:30 PM.",
  ),
  Attraction(
    name: "Mirissa & Hiriketiya Coastal Bay",
    destination: "Mirissa & Dikwella, Southern Province",
    category: "Beaches & Coastal",
    description: "Curved crescent golden beaches lined with coconut palms, crystal-clear turquoise waters, whale watching expeditions, and legendary horseshoe surf bays.",
    imageUrl: "assets/images/coastal-aerial.jpg",
    feeLkr: 0.0,
    rating: 4.8,
    tip: "Whale watching boats depart Mirissa Harbour at 6:30 AM during Nov-Apr season.",
  ),
  Attraction(
    name: "Sigiriya Ancient Citadel & Water Gardens",
    destination: "Sigiriya, Central Province",
    category: "Historical Ruins",
    description: "Aerial view of King Kashyapa's hydraulic engineering marvel, featuring symmetrical water pavilions, boulder gardens, moats, and ancient tiered ramparts.",
    imageUrl: "assets/images/sigiriya-aerial.jpg",
    feeLkr: 11000.0,
    rating: 4.9,
    tip: "Explore the ancient water gardens early in the morning before ascending the summit rock.",
  ),
  Attraction(
    name: "Yala National Park Peacock & Wildlife Safari",
    destination: "Yala, Southern / Uva Province",
    category: "Wildlife & Nature",
    description: "Sri Lanka's premier wildlife sanctuary boasting one of the world's highest leopard densities, majestic wild peacocks in ancient trees, elephants, and sloth bears.",
    imageUrl: "assets/images/wildlife-peacock.jpg",
    feeLkr: 13500.0,
    rating: 4.9,
    tip: "Book an early morning 5:30 AM half-day safari with an experienced local tracker.",
  ),
  Attraction(
    name: "Nine Arches Bridge & Ella Peak",
    destination: "Ella, Uva Province",
    category: "Hiking & Peaks",
    description: "Iconic colonial-era viaduct bridge surrounded by emerald tea plantations. Watch the famous blue mountain train pass over the bridge.",
    imageUrl: "https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&w=800&q=80",
    feeLkr: 0.0,
    rating: 4.8,
    tip: "Train passing times: ~9:30 AM, 11:45 AM, 3:30 PM. Visit Cafe Chill afterwards.",
  ),
  Attraction(
    name: "Galle Dutch Fort & Lighthouse",
    destination: "Galle, Southern Province",
    category: "Historical Ruins",
    description: "Living 17th-century UNESCO World Heritage fortress built by the Portuguese and fortified by the Dutch, with cobbled alleys, boutique cafes, and ramparts.",
    imageUrl: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=800&q=80",
    feeLkr: 0.0,
    rating: 4.8,
    tip: "Walk along the ocean ramparts during golden hour sunset (5:30 PM - 6:30 PM).",
  ),
  Attraction(
    name: "Diyaluma Falls & Infinity Rock Pools",
    destination: "Koslanda / Ella, Uva Province",
    category: "Natural Waterfalls",
    description: "Sri Lanka's second highest waterfall (220m) featuring cascading natural upper infinity rock pools overlooking panoramic valleys.",
    imageUrl: "assets/images/coastal-aerial.jpg",
    feeLkr: 0.0,
    rating: 4.9,
    tip: "Hike down from Makaldenya junction to access the upper natural swimming pools safely.",
  ),
  Attraction(
    name: "Ancient City of Polonnaruwa",
    destination: "Polonnaruwa, North Central",
    category: "Historical Ruins",
    description: "Magnificent medieval royal capital featuring the Gal Vihara rock statues, the circular Vatadage, and King Parakramabahu's Royal Palace.",
    imageUrl: "assets/images/sigiriya-aerial.jpg",
    feeLkr: 9500.0,
    rating: 4.8,
    tip: "Rent a bicycle at the main ticket gate to comfortably ride through the ancient ruins.",
  ),
  Attraction(
    name: "Udawalawe Elephant Sanctuary",
    destination: "Udawalawe, Sabaragamuwa",
    category: "Wildlife & Nature",
    description: "Open grasslands rivaling East African savannahs, guaranteeing wild Asian elephant sightings in large family herds around the reservoir.",
    imageUrl: "assets/images/wildlife-peacock.jpg",
    feeLkr: 11000.0,
    rating: 4.8,
    tip: "Visit the Elephant Transit Home feeding time at 10:30 AM or 2:30 PM before safari.",
  ),
];


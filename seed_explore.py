import json
import urllib.request
import urllib.error

API_URL = "http://localhost:5127/api/catalog"
HEADERS = {
    "Content-Type": "application/json",
    "X-User-Role": "StaffAdmin",
    "X-User-Id": "explore-admin"
}

ATTRACTIONS = [
    # --- HISTORICAL RUINS ---
    {
        "type": 0,  # VisitingPlace
        "name": "Sigiriya Lion Rock Fortress",
        "destination": "Matale, Central Province",
        "description": "Rising 200 meters above lush jungle, Sigiriya is an ancient 5th-century citadel built atop a sheer granite monolith by King Kashyapa. Known as the Eighth Wonder of the World, it features intricate water gardens, legendary celestial maiden frescoes, the polished Mirror Wall, and colossal carved lion paws guarding the summit stairway.",
        "address": "https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&w=1200&q=80",
        "contact": "Best Season: Dec - Apr • Start climb at 6:30 AM to beat heat and crowds",
        "price": 11000.0,
        "currency": "LKR",
        "cuisineOrCategory": "Historical Ruins",
        "rating": 4.9
    },
    {
        "type": 0,
        "name": "Ancient City of Polonnaruwa",
        "destination": "Polonnaruwa, North Central Province",
        "description": "Sri Lanka's magnificent medieval royal capital from the 11th to 13th centuries. A sprawling UNESCO archaeological park featuring the Royal Palace of King Parakramabahu, the circular Vatadage relic house, Rankoth Vehera stupa, and the world-famous Gal Vihara with four colossal Buddha statues carved directly out of a single granite bluff.",
        "address": "https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&w=1200&q=80",
        "contact": "Best Season: Jan - Sep • Renting a bicycle at the entrance is the best way to explore",
        "price": 9500.0,
        "currency": "LKR",
        "cuisineOrCategory": "Historical Ruins",
        "rating": 4.8
    },
    {
        "type": 0,
        "name": "Sacred City of Anuradhapura",
        "destination": "Anuradhapura, North Central Province",
        "description": "Sri Lanka's first capital flourished for over 1,300 years as the epicentre of Theravada Buddhism. Explore colossal ancient stupas like Ruwanwelisaya and Jetavanaramaya (once the third tallest structure in the world after the Egyptian pyramids), along with the Sacred Jaya Sri Maha Bodhi tree—the oldest documented human-planted tree on Earth.",
        "address": "https://images.unsplash.com/photo-1609137144813-7d9921338f24?auto=format&fit=crop&w=1200&q=80",
        "contact": "Best Season: Jun - Sep • Dress respectfully with shoulders and knees covered in white attire",
        "price": 9500.0,
        "currency": "LKR",
        "cuisineOrCategory": "Historical Ruins",
        "rating": 4.9
    },
    {
        "type": 0,
        "name": "Dambulla Royal Cave Temple",
        "destination": "Dambulla, Central Province",
        "description": "The largest and best-preserved cave temple complex in South Asia, perched beneath a 160m cliff. Dating back to the 1st century BC, five natural rock caverns house 157 exquisite gilded statues of Buddha and over 2,100 square meters of vibrant ceiling frescoes portraying ancient Buddhist history and royal lineage.",
        "address": "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80",
        "contact": "Best Season: Year-round • Footwear must be removed before entering the cave sanctuary",
        "price": 3000.0,
        "currency": "LKR",
        "cuisineOrCategory": "Historical Ruins",
        "rating": 4.8
    },
    {
        "type": 0,
        "name": "Galle Dutch Fort & Lighthouse",
        "destination": "Galle, Southern Province",
        "description": "A living 17th-century UNESCO World Heritage fortress founded by the Portuguese and extensively fortified by Dutch colonialists. Stroll along centuries-old sea-facing granite bastions, visit the iconic 1939 white lighthouse at Point Utrecht, explore chic boutique art galleries, spice shops, and colonial architecture overlooking the Indian Ocean.",
        "address": "https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&w=1200&q=80",
        "contact": "Best Season: Nov - Apr • Free public entry, best enjoyed during golden sunset hours",
        "price": 0.0,
        "currency": "LKR",
        "cuisineOrCategory": "Historical Ruins",
        "rating": 4.9
    },

    # --- BEACHES ---
    {
        "type": 0,
        "name": "Mirissa Beach & Coconut Tree Hill",
        "destination": "Mirissa, Southern Province",
        "description": "A tropical paradise featuring a crescent of golden sands fringed with swaying palms and beachside seafood restaurants. Mirissa is globally acclaimed as a prime hub for blue whale and dolphin watching, surfing warm right-hand reef breaks, and snapping sunrise photos at the iconic palm-studded headland of Coconut Tree Hill.",
        "address": "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1200&q=80",
        "contact": "Best Season: Nov - Apr • Blue whale safaris operate daily from 6:30 AM from Mirissa harbor",
        "price": 0.0,
        "currency": "LKR",
        "cuisineOrCategory": "Beaches",
        "rating": 4.9
    },
    {
        "type": 0,
        "name": "Unawatuna & Jungle Beach",
        "destination": "Unawatuna, Southern Province",
        "description": "A lively horseshoe-shaped bay protected by a double reef, offering calm crystalline waters ideal for swimming and family watersports. A short nature trail through Rumassala sanctuary leads to secluded Jungle Beach, a hidden haven for snorkeling among vibrant corals and tropical fish.",
        "address": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        "contact": "Best Season: Nov - Apr • Excellent sunset dining right on the water's edge",
        "price": 0.0,
        "currency": "LKR",
        "cuisineOrCategory": "Beaches",
        "rating": 4.7
    },
    {
        "type": 0,
        "name": "Nilaveli Beach & Pigeon Island",
        "destination": "Trincomalee, Eastern Province",
        "description": "Renowned for pearly-white sand shores and calm, turquoise waters stretching for miles along the eastern coastline. Just 1 km offshore lies Pigeon Island National Park, where crystal-clear coral reefs allow visitors to snorkel alongside harmless blacktip reef sharks, green sea turtles, and colorful schools of angel fish.",
        "address": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
        "contact": "Best Season: May - Sep (East Coast Summer) • Boat transfers to Pigeon Island depart from Nilaveli",
        "price": 0.0,
        "currency": "LKR",
        "cuisineOrCategory": "Beaches",
        "rating": 4.9
    },
    {
        "type": 0,
        "name": "Arugam Bay Surf Haven",
        "destination": "Arugam Bay, Eastern Province",
        "description": "Ranked among the top surf destinations on the planet, Arugam Bay is a bohemian surf town known for world-class right-hand point breaks such as Main Point, Peanut Farm, and Elephant Rock. In the evening, the main strip comes alive with artisanal woodfired pizzerias, reggae lounges, and traveler meetups.",
        "address": "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1200&q=80",
        "contact": "Best Season: Apr - Oct • Perfect for surf lessons, board rentals, and coastal yoga retreats",
        "price": 0.0,
        "currency": "LKR",
        "cuisineOrCategory": "Beaches",
        "rating": 4.8
    },
    {
        "type": 0,
        "name": "Tangalle Silent Beach",
        "destination": "Tangalle, Southern Province",
        "description": "A tranquil, untouched expanse of powder-soft golden sand nestled between rocky coves and groves of coconut palms. Known for dramatic turquoise ocean swells and peaceful solitude, it is the ultimate romantic getaway and an important nesting habitat for endangered marine turtles in nearby Rekawa.",
        "address": "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1200&q=80",
        "contact": "Best Season: Nov - Apr • Sea currents can be strong; swim in sheltered tide pools",
        "price": 0.0,
        "currency": "LKR",
        "cuisineOrCategory": "Beaches",
        "rating": 4.8
    },

    # --- NATURAL WATERFALLS ---
    {
        "type": 0,
        "name": "Diyaluma Falls & Infinity Rock Pools",
        "destination": "Koslanda, Uva Province",
        "description": "Standing at 220 meters, Diyaluma is Sri Lanka's second highest waterfall. A hike to the upper falls reveals a series of natural infinity rock pools suspended on the edge of the precipice, offering one of the most exhilarating natural swimming experiences and panoramic mountain valley vistas in Asia.",
        "address": "https://images.unsplash.com/photo-1546587348-d12660c30c50?auto=format&fit=crop&w=1200&q=80",
        "contact": "Best Season: Jan - May • Local village guides available for the upper falls trail",
        "price": 0.0,
        "currency": "LKR",
        "cuisineOrCategory": "Natural Waterfalls",
        "rating": 4.9
    },
    {
        "type": 0,
        "name": "Ravana Falls",
        "destination": "Ella, Uva Province",
        "description": "A spectacular 25-meter cascading tiered waterfall named after King Ravana of the epic Ramayana chronicle. Located conveniently alongside the Wellawaya-Ella road, this thunderous cascade surges through curved limestone rocks surrounded by verdant hill country tea valleys.",
        "address": "https://images.unsplash.com/photo-1518457607834-6e8d80c183c5?auto=format&fit=crop&w=1200&q=80",
        "contact": "Best Season: Year-round • Best photographed during morning light when mist clears",
        "price": 0.0,
        "currency": "LKR",
        "cuisineOrCategory": "Natural Waterfalls",
        "rating": 4.6
    },
    {
        "type": 0,
        "name": "Dunhinda Falls",
        "destination": "Badulla, Uva Province",
        "description": "Nicknamed 'The Smoky Falls' due to the thick veil of dew-like mist spraying from its 64-meter plunge into a deep river basin. Reached via a scenic 1.5 km forest trail populated by wild monkeys and native birds, Dunhinda provides a sensory marvel of roaring natural power.",
        "address": "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1200&q=80",
        "contact": "Best Season: Nov - Apr • Wear non-slip walking shoes; forest trail has clay steps",
        "price": 300.0,
        "currency": "LKR",
        "cuisineOrCategory": "Natural Waterfalls",
        "rating": 4.7
    },
    {
        "type": 0,
        "name": "Bambarakanda Falls",
        "destination": "Kalupahana, Uva Province",
        "description": "Soaring at 263 meters (863 ft), Bambarakanda is the highest waterfall in Sri Lanka. It cascades like a slender white ribbon down an immense sheer rock face amidst evergreen pine forests and misty highland peaks, offering quiet hiking trails connecting to devil's staircase.",
        "address": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80",
        "contact": "Best Season: Oct - Mar (Post-monsoon has maximum water flow)",
        "price": 200.0,
        "currency": "LKR",
        "cuisineOrCategory": "Natural Waterfalls",
        "rating": 4.8
    },

    # --- HIKING & PEAKS ---
    {
        "type": 0,
        "name": "Ella Rock & Nine Arches Bridge",
        "destination": "Ella, Uva Province",
        "description": "Ella is the hiking capital of Sri Lanka's central highlands. This trail takes you along historic railway sleepers to the world-famous colonial Nine Arches Bridge (Bridge in the Sky), before climbing through eucalyptus woodlands and tea estates to Ella Rock for breathtaking bird's-eye views across the Ella Gap.",
        "address": "https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&w=1200&q=80",
        "contact": "Best Season: Jan - May • Time your visit to watch the blue highland train pass over the bridge",
        "price": 0.0,
        "currency": "LKR",
        "cuisineOrCategory": "Hiking & Peaks",
        "rating": 4.9
    },
    {
        "type": 0,
        "name": "Adam's Peak (Sri Pada)",
        "destination": "Nallathanniya, Central Province",
        "description": "A sacred 2,243m conical mountain venerated by all major religions for the sacred footprint atop its summit. Tens of thousands of pilgrims and travelers undertake the illuminated night ascent of 5,500 stone steps to witness the ethereal sunrise and the miraculous triangular shadow cast across the cloud canopy.",
        "address": "https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&w=1200&q=80",
        "contact": "Pilgrimage Season: Dec Full Moon to May Full Moon (Pathways are fully illuminated with tea stalls)",
        "price": 0.0,
        "currency": "LKR",
        "cuisineOrCategory": "Hiking & Peaks",
        "rating": 4.9
    },
    {
        "type": 0,
        "name": "Pidurangala Rock Sunrise Scramble",
        "destination": "Sigiriya, Central Province",
        "description": "Located directly adjacent to Sigiriya Rock, Pidurangala is a massive rocky outcrop that offers an adventurous trek ending with a thrilling boulder scramble. The vast summit plateau delivers the most awe-inspiring 360-degree panoramic sunrise vista gazing directly at the majestic Lion Rock citadel.",
        "address": "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80",
        "contact": "Best Season: Dec - Apr • Start climbing at 5:00 AM with a headlamp for dawn views",
        "price": 1000.0,
        "currency": "LKR",
        "cuisineOrCategory": "Hiking & Peaks",
        "rating": 4.9
    },
    {
        "type": 0,
        "name": "Knuckles Mountain Range",
        "destination": "Matale / Kandy, Central Province",
        "description": "Named for its resemblance to the folded knuckles of a clenched fist, this UNESCO World Heritage wilderness encompasses 34 mountain peaks wrapped in mystical cloud forests, crystal mountain streams, hidden hamlets, and an unparalleled concentration of rare endemic birds, reptiles, and orchids.",
        "address": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80",
        "contact": "Best Season: Jun - Sep & Dec - Feb • Certified trekking guide and forest permit required",
        "price": 2500.0,
        "currency": "LKR",
        "cuisineOrCategory": "Hiking & Peaks",
        "rating": 4.8
    },

    # --- WILDLIFE & NATURE ---
    {
        "type": 0,
        "name": "Yala National Park Safari",
        "destination": "Hambantota, Southern Province",
        "description": "Sri Lanka's premier wildlife sanctuary bordering the Indian Ocean, famous for holding one of the highest leopard densities in the world. Open 4x4 jeep safaris venture into arid thorny scrubland, lagoons, and rocky outcrops to spot elusive Sri Lankan leopards, sloth bears, wild elephants, saltwater crocodiles, and vibrant birdlife.",
        "address": "https://images.unsplash.com/photo-1534177616072-ef7dc120449d?auto=format&fit=crop&w=1200&q=80",
        "contact": "Best Season: Feb - Jul (Dry season congregates wildlife at waterholes) • Morning safari starts 5:30 AM",
        "price": 12500.0,
        "currency": "LKR",
        "cuisineOrCategory": "Wildlife & Nature",
        "rating": 4.9
    },
    {
        "type": 0,
        "name": "Udawalawe National Park",
        "destination": "Sabaragamuwa / Uva Province",
        "description": "Centred around a massive reservoir against a dramatic backdrop of mountain ridges, Udawalawe rivals the savannas of East Africa. It is the premier sanctuary for seeing herds of wild Asian elephants in their natural habitat, alongside water buffaloes, jackals, sambar deer, and birds of prey.",
        "address": "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=1200&q=80",
        "contact": "Best Season: Year-round • Visit the nearby Elephant Transit Home during milk-feeding sessions",
        "price": 11000.0,
        "currency": "LKR",
        "cuisineOrCategory": "Wildlife & Nature",
        "rating": 4.9
    },
    {
        "type": 0,
        "name": "Sinharaja UNESCO Rain Forest Reserve",
        "destination": "Southern & Sabaragamuwa Province",
        "description": "The last viable expanse of primary tropical virgin rainforest in Sri Lanka, recognized as a UNESCO World Heritage site and World Biosphere Reserve. Walking through this ancient jungle canopy reveals fascinating mixed-species bird feeding flocks, purple-faced langurs, cascading streams, and medicinal rainforest trees found nowhere else on the planet.",
        "address": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",
        "contact": "Best Season: Dec - Apr & Aug - Sep • Leech socks and an authorized wildlife tracker are essential",
        "price": 3500.0,
        "currency": "LKR",
        "cuisineOrCategory": "Wildlife & Nature",
        "rating": 4.9
    },
    {
        "type": 0,
        "name": "Minneriya National Park - Elephant Gathering",
        "destination": "Habarana, North Central Province",
        "description": "Home to 'The Gathering'—rated by Lonely Planet and National Geographic as one of the World's Top 10 Wildlife Spectacles. During the dry season, up to 300 Asian elephants congregate on the lush green shores of the 3rd-century Minneriya reservoir to feed, play, and socialize in a breathtaking natural congregation.",
        "address": "https://images.unsplash.com/photo-1564760055775-d63b17a55c44?auto=format&fit=crop&w=1200&q=80",
        "contact": "Best Season: Jul - Oct (Peak Gathering) • Afternoon safaris (2:30 PM - 6:00 PM) offer optimal viewing",
        "price": 11500.0,
        "currency": "LKR",
        "cuisineOrCategory": "Wildlife & Nature",
        "rating": 4.8
    }
]

def main():
    print("Fetching existing catalog items...")
    try:
        req = urllib.request.Request(API_URL)
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            existing_names = set(item.get('name', '').lower() for item in data)
            print(f"Found {len(existing_names)} existing items.")
    except Exception as e:
        print(f"Error fetching catalog: {e}")
        existing_names = set()

    added = 0
    for att in ATTRACTIONS:
        if att['name'].lower() in existing_names:
            print(f"Skipping existing: {att['name']}")
            continue
        try:
            body = json.dumps(att).encode('utf-8')
            req = urllib.request.Request(API_URL, data=body, headers=HEADERS, method='POST')
            with urllib.request.urlopen(req) as resp:
                if resp.status in (200, 201):
                    added += 1
                    print(f"Added: {att['name']} ({att['cuisineOrCategory']})")
                else:
                    print(f"Failed {att['name']}: {resp.status}")
        except Exception as e:
            print(f"Error adding {att['name']}: {e}")

    print(f"\nSuccessfully seeded {added} attractions into TravelWise Explore Sri Lanka catalog!")

if __name__ == "__main__":
    main()

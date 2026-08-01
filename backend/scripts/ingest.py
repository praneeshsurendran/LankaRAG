"""
scripts/ingest.py — Full data ingestion pipeline for LankaRAG.

What this script does:
  1. Connects to PostgreSQL and creates the tourist_attractions table (DDL)
  2. Seeds 25+ Sri Lanka tourist attractions across 5 categories
  3. Loads sentence-transformer model and encodes descriptions → text embeddings
  4. Upserts text embeddings into Pinecone text index (dim=384)
  5. Loads CLIP model and encodes image URLs → image embeddings
  6. Upserts image embeddings into Pinecone image index (dim=512)

Run from the /backend directory:
    python scripts/ingest.py

Prerequisites:
  - Docker Compose PostgreSQL is running (docker compose up -d)
  - .env file is configured with valid Pinecone and Gemini keys
  - pip install -r requirements.txt
  - pip install git+https://github.com/openai/CLIP.git
"""

import io
import logging
import os
import sys
import time

# Ensure the backend/ directory is on the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import clip
import requests
import torch
from PIL import Image
from pinecone import Pinecone, ServerlessSpec
from sentence_transformers import SentenceTransformer
from sqlalchemy import create_engine, text
from tqdm import tqdm

from config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()

# ─────────────────────────────────────────────────────────────────
#  Tourist Attraction Seed Data
#  25 attractions across 5 categories:
#    Beaches, Waterfalls, Historical Sites, National Parks, Temples
# ─────────────────────────────────────────────────────────────────

ATTRACTIONS = [
    # ── Beaches ──────────────────────────────────────────────────
    {
        "name": "Unawatuna Beach",
        "category": "Beaches",
        "district": "Galle",
        "entrance_fee_usd": 0.0,
        "difficulty_level": "Easy",
        "description": (
            "A stunning crescent-shaped golden sand beach sheltered by coral reefs, "
            "Unawatuna is one of Sri Lanka's most famous beaches. The calm turquoise "
            "waters make it ideal for swimming, snorkelling, and diving. Lined with "
            "colourful beach restaurants and boutique guesthouses, it offers a perfect "
            "blend of relaxation and vibrant beach life. The nearby jungle-clad "
            "headland and Japanese Peace Pagoda add cultural charm."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Unawatuna_beach.jpg/1280px-Unawatuna_beach.jpg",
    },
    {
        "name": "Mirissa Beach",
        "category": "Beaches",
        "district": "Matara",
        "entrance_fee_usd": 0.0,
        "difficulty_level": "Easy",
        "description": (
            "A laid-back paradise beach famed for whale watching between November and "
            "April, Mirissa features soft white sand, swaying palms, and warm Indian "
            "Ocean waters. The iconic Parrot Rock at the eastern end offers panoramic "
            "sunset views. Surf-worthy waves and fresh seafood restaurants make this a "
            "top destination for surfers and food lovers alike."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Mirissa_beach.jpg/1280px-Mirissa_beach.jpg",
    },
    {
        "name": "Arugam Bay",
        "category": "Beaches",
        "district": "Ampara",
        "entrance_fee_usd": 0.0,
        "difficulty_level": "Moderate",
        "description": (
            "Internationally acclaimed as one of Asia's top surfing destinations, "
            "Arugam Bay on Sri Lanka's east coast draws wave-riders from around the "
            "world. The main point break delivers consistent 2-3 metre waves from "
            "May to October. Beyond surfing, the surrounding lagoons teem with "
            "crocodiles, elephants, and rare migratory birds. Chill beach bars and "
            "vibrant evening markets complete the experience."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Arugam_Bay.jpg/1280px-Arugam_Bay.jpg",
    },
    {
        "name": "Tangalle Beach",
        "category": "Beaches",
        "district": "Hambantota",
        "entrance_fee_usd": 0.0,
        "difficulty_level": "Easy",
        "description": (
            "Tangalle is a collection of beautiful secluded bays separated by rocky "
            "headlands, offering a quieter alternative to the more crowded southern "
            "beaches. The clear blue waters are great for swimming (in calm season) "
            "and the area is an important nesting site for sea turtles. The ancient "
            "Dutch fort and traditional fishing harbour add historical character. "
            "Sunsets over the Indian Ocean here are breathtaking."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Tangalle_beach.jpg/1280px-Tangalle_beach.jpg",
    },
    {
        "name": "Nilaveli Beach",
        "category": "Beaches",
        "district": "Trincomalee",
        "entrance_fee_usd": 0.0,
        "difficulty_level": "Easy",
        "description": (
            "Stretching for kilometres along Sri Lanka's northeast coast, Nilaveli "
            "is one of the island's most pristine and uncrowded beaches. The crystal "
            "clear waters offer excellent snorkelling, especially around the nearby "
            "Pigeon Island — a national marine park with vibrant coral reefs and "
            "blacktip reef sharks. Best visited from April to September when the "
            "seas are calm and visibility is exceptional."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Nilaveli_beach.jpg/1280px-Nilaveli_beach.jpg",
    },
    # ── Waterfalls ────────────────────────────────────────────────
    {
        "name": "Bambarakanda Falls",
        "category": "Waterfalls",
        "district": "Badulla",
        "entrance_fee_usd": 1.50,
        "difficulty_level": "Moderate",
        "description": (
            "The tallest waterfall in Sri Lanka at 263 metres, Bambarakanda plunges "
            "dramatically through montane rainforest in the Knuckles Mountain Range "
            "area. The hike to the base passes through pine forests and scenic "
            "highland meadows. The mist spray creates natural rainbows on sunny "
            "mornings. Surrounded by tea estates and endemic bird species, this is "
            "a paradise for nature photographers and hikers seeking dramatic scenery."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Bambarakanda_falls.jpg/800px-Bambarakanda_falls.jpg",
    },
    {
        "name": "Ravana Falls",
        "category": "Waterfalls",
        "district": "Badulla",
        "entrance_fee_usd": 2.00,
        "difficulty_level": "Easy",
        "description": (
            "One of the widest waterfalls in Asia, Ravana Falls cascades 25 metres "
            "down a broad rocky face in a spectacular fan shape. Located near Ella, "
            "it is steeped in mythology as the cave behind it is believed to be where "
            "the demon king Ravana hid Sita in the Ramayana epic. The cool mist and "
            "surrounding tropical greenery make this a refreshing stop on the Ella "
            "road. Easily accessible with ample parking nearby."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Rawana_ella.jpg/800px-Rawana_ella.jpg",
    },
    {
        "name": "Diyaluma Falls",
        "category": "Waterfalls",
        "district": "Monaragala",
        "entrance_fee_usd": 3.00,
        "difficulty_level": "Hard",
        "description": (
            "Sri Lanka's second highest waterfall at 220 metres, Diyaluma is a "
            "breathtaking single-drop plunge over a sheer cliff face into an emerald "
            "pool below. The adventurous hike to the top leads through jungle and "
            "streams, rewarding trekkers with natural rock pool infinity baths with "
            "panoramic views over the lowland jungle. The waterfall is most powerful "
            "during the wet season (October-January) but stunning year-round."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Diyaluma_Falls.jpg/800px-Diyaluma_Falls.jpg",
    },
    {
        "name": "Laxapana Falls",
        "category": "Waterfalls",
        "district": "Kegalle",
        "entrance_fee_usd": 1.00,
        "difficulty_level": "Moderate",
        "description": (
            "Located in the Adam's Peak Wilderness Sanctuary, Laxapana Falls drops "
            "126 metres into the Maskeliya Oya river. The surrounding area is a "
            "designated sanctuary protecting rare endemic species including purple-"
            "faced langurs and sambar deer. The waterfall is visible from the road "
            "but a short jungle trail brings you to the cool splash zone at the base. "
            "Best visited in the morning when the sun illuminates the fall."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Laxapana_falls.jpg/800px-Laxapana_falls.jpg",
    },
    {
        "name": "Aberdeen Falls",
        "category": "Waterfalls",
        "district": "Nuwara Eliya",
        "entrance_fee_usd": 4.00,
        "difficulty_level": "Moderate",
        "description": (
            "Nestled within Castlereagh Reservoir catchment area, Aberdeen Falls is "
            "a serene 98-metre waterfall surrounded by cloud forest and tea estates. "
            "The trail passes through colonial-era tea country with sweeping highland "
            "views. The waterfall drops into a deep gorge rarely visited by tourists, "
            "making it a hidden gem for hikers. Cool highland temperatures year-round "
            "make it a refreshing retreat from lowland heat."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Aberdeen_Falls_Sri_Lanka.jpg/800px-Aberdeen_Falls_Sri_Lanka.jpg",
    },
    # ── Historical Sites ──────────────────────────────────────────
    {
        "name": "Sigiriya Rock Fortress",
        "category": "Historical Sites",
        "district": "Matale",
        "entrance_fee_usd": 30.00,
        "difficulty_level": "Moderate",
        "description": (
            "Declared a UNESCO World Heritage Site, Sigiriya is an ancient rock "
            "fortress and palace ruin built by King Kashyapa in the 5th century. "
            "Rising 200 metres from the surrounding jungle, the Lion Rock features "
            "remarkable frescoes of celestial maidens, the iconic Lion's Paw gateway, "
            "and a sophisticated hydraulic system. The summit offers 360-degree views "
            "across the Cultural Triangle. One of the most spectacular archaeological "
            "sites in Asia."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Sigiriya_mirror_wall.jpg/1280px-Sigiriya_mirror_wall.jpg",
    },
    {
        "name": "Polonnaruwa Ancient City",
        "category": "Historical Sites",
        "district": "Polonnaruwa",
        "entrance_fee_usd": 25.00,
        "difficulty_level": "Easy",
        "description": (
            "The medieval capital of Sri Lanka (11th-13th centuries), Polonnaruwa is "
            "a UNESCO World Heritage Site containing remarkably preserved ruins of "
            "palaces, temples, and statues. Highlights include the Gal Vihara rock "
            "temple with its colossal reclining Buddha, the Vatadage circular relic "
            "house, and the Parakrama Samudra irrigation tank. Best explored by bicycle "
            "along scenic paths through the archaeological park."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Polonnaruwa_Gal_Vihara.jpg/1280px-Polonnaruwa_Gal_Vihara.jpg",
    },
    {
        "name": "Anuradhapura Sacred City",
        "category": "Historical Sites",
        "district": "Anuradhapura",
        "entrance_fee_usd": 25.00,
        "difficulty_level": "Easy",
        "description": (
            "The oldest and most sacred city in Sri Lanka, Anuradhapura was the "
            "island's first capital for over 1,000 years. The UNESCO-listed sacred "
            "precinct contains massive dagobas (stupas), the sacred Sri Maha Bodhi "
            "tree (a sapling from the original Bodhi tree under which Buddha attained "
            "enlightenment), ancient palace ruins, and monastic complexes. A deeply "
            "spiritual destination blending history, Buddhism, and architecture."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Anuradhapura_Ruwanwelisaya.jpg/1280px-Anuradhapura_Ruwanwelisaya.jpg",
    },
    {
        "name": "Galle Fort",
        "category": "Historical Sites",
        "district": "Galle",
        "entrance_fee_usd": 0.0,
        "difficulty_level": "Easy",
        "description": (
            "A UNESCO World Heritage Site, Galle Fort was built by the Portuguese "
            "in 1588 and extensively fortified by the Dutch. The 90-acre promontory "
            "fort contains a living township with colonial-era churches, mosques, "
            "boutique hotels, art galleries, and cafes. Walking the 1.5km rampart "
            "walls at sunset offers stunning views over the Indian Ocean. The fort "
            "uniquely blends European colonial architecture with South Asian "
            "cultural traditions."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Galle_fort.jpg/1280px-Galle_fort.jpg",
    },
    {
        "name": "Yapahuwa Rock Fortress",
        "category": "Historical Sites",
        "district": "Kurunegala",
        "entrance_fee_usd": 5.00,
        "difficulty_level": "Moderate",
        "description": (
            "A lesser-visited gem, Yapahuwa was briefly the medieval capital of "
            "Sri Lanka in the 13th century. The ornate ceremonial stairway with "
            "its intricate stone carvings rivals anything at Polonnaruwa. The sheer "
            "rock face rises 90 metres above the surrounding flat jungle, offering "
            "dramatic panoramic views. The site retains an atmosphere of mystery "
            "and is rarely crowded, making it perfect for quiet exploration."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Yapahuwa_stairway.jpg/800px-Yapahuwa_stairway.jpg",
    },
    # ── National Parks ────────────────────────────────────────────
    {
        "name": "Yala National Park",
        "category": "National Parks",
        "district": "Hambantota",
        "entrance_fee_usd": 15.00,
        "difficulty_level": "Easy",
        "description": (
            "Sri Lanka's most famous wildlife sanctuary, Yala has the world's highest "
            "density of leopards. The scrub forest and lagoon ecosystem supports "
            "elephants, sloth bears, crocodiles, hundreds of bird species, and "
            "monkeys. Jeep safaris at dawn and dusk offer the best wildlife sightings. "
            "Block 1 is the most visited, while blocks 2-5 offer more pristine "
            "wilderness. The nearby Sithulpahuwa rock temple adds cultural depth "
            "to a wildlife adventure."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Leopard_in_Yala.jpg/1280px-Leopard_in_Yala.jpg",
    },
    {
        "name": "Minneriya National Park",
        "category": "National Parks",
        "district": "Polonnaruwa",
        "entrance_fee_usd": 15.00,
        "difficulty_level": "Easy",
        "description": (
            "Famous for 'The Gathering' — the world's largest congregation of Asian "
            "elephants — Minneriya draws hundreds of elephants to its ancient reservoir "
            "between July and October as water levels drop. The park also shelters "
            "leopards, deer, buffaloes, and over 160 bird species. The Minneriya "
            "Reservoir itself is a haven for migratory waterbirds. Jeep safaris "
            "through open grasslands and dense forest offer excellent photographic "
            "opportunities."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Minneriya_elephants.jpg/1280px-Minneriya_elephants.jpg",
    },
    {
        "name": "Horton Plains National Park",
        "category": "National Parks",
        "district": "Nuwara Eliya",
        "entrance_fee_usd": 27.00,
        "difficulty_level": "Moderate",
        "description": (
            "A hauntingly beautiful highland plateau at 2,100 metres, Horton Plains "
            "protects Sri Lanka's most important watershed. The 9km circular walk "
            "leads through rolling grasslands and cloud forest to World's End — a "
            "sheer escarpment dropping 880 metres — and Baker's Falls, a picturesque "
            "20m cascade. Misty mornings hide rare wildlife including sambar deer, "
            "leopard, and endemic birds like the dull-blue flycatcher."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Horton_Plains_Worlds_End.jpg/1280px-Horton_Plains_Worlds_End.jpg",
    },
    {
        "name": "Udawalawe National Park",
        "category": "National Parks",
        "district": "Ratnapura",
        "entrance_fee_usd": 15.00,
        "difficulty_level": "Easy",
        "description": (
            "The best park in Sri Lanka for reliable elephant sightings, Udawalawe "
            "is home to over 600 wild elephants that freely roam its vast grasslands "
            "and teak forests around the Udawalawe Reservoir. The Elephant Transit "
            "Home on the park boundary rehabilitates orphaned elephant calves. "
            "Buffaloes, crocodiles, jackals, and abundant raptors round out the "
            "wildlife experience. Easily accessible from the southern highway."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Udawalawe_elephants.jpg/1280px-Udawalawe_elephants.jpg",
    },
    {
        "name": "Wilpattu National Park",
        "category": "National Parks",
        "district": "Mannar",
        "entrance_fee_usd": 15.00,
        "difficulty_level": "Moderate",
        "description": (
            "Sri Lanka's largest national park, Wilpattu is defined by its unique "
            "natural lakes called 'Villus' — flat-bottomed depressions that fill "
            "with rainwater. These attract leopards, sloth bears, elephants, and "
            "endemic deer to their shores. The park's remoteness preserved it as "
            "one of the least disturbed ecosystems on the island. Seldom crowded, "
            "it offers an authentic wilderness safari far from the tourist circuit."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Wilpattu_lake.jpg/1280px-Wilpattu_lake.jpg",
    },
    # ── Temples ───────────────────────────────────────────────────
    {
        "name": "Temple of the Sacred Tooth Relic",
        "category": "Temples",
        "district": "Kandy",
        "entrance_fee_usd": 6.00,
        "difficulty_level": "Easy",
        "description": (
            "Sri Lanka's most sacred Buddhist site, the Sri Dalada Maligawa houses "
            "the left canine tooth of the Buddha, brought to Sri Lanka in the 4th "
            "century. The golden-roofed inner sanctum draws thousands of pilgrims "
            "daily. The evening Puja ceremony with drummers, flutists, and the scent "
            "of incense is deeply moving. Located within the Kandy royal palace "
            "complex beside the scenic Kandy Lake. A UNESCO World Heritage Site."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Sri_Dalada_Maligawa.jpg/1280px-Sri_Dalada_Maligawa.jpg",
    },
    {
        "name": "Kelaniya Raja Maha Vihara",
        "category": "Temples",
        "district": "Colombo",
        "entrance_fee_usd": 0.0,
        "difficulty_level": "Easy",
        "description": (
            "One of the most sacred Buddhist temples in Sri Lanka, Kelaniya is "
            "believed to have been visited by the Buddha himself. The magnificent "
            "white dagoba and ornate painted image house are adorned with detailed "
            "murals depicting Buddhist Jataka stories. The annual Duruthu Perahera "
            "festival in January draws hundreds of thousands of devotees. Located "
            "just 11km from Colombo, it is easily accessible as a day trip."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Kelaniya_temple.jpg/1280px-Kelaniya_temple.jpg",
    },
    {
        "name": "Dambulla Cave Temple",
        "category": "Temples",
        "district": "Matale",
        "entrance_fee_usd": 10.00,
        "difficulty_level": "Easy",
        "description": (
            "The largest and best-preserved cave temple complex in Sri Lanka, "
            "Dambulla contains five interconnected caves with over 150 Buddha statues "
            "and more than 2,100 square metres of vivid ceiling paintings dating "
            "back to the 1st century BCE. A UNESCO World Heritage Site, the golden "
            "temple at the base shines brilliantly against the 160-metre rock face. "
            "The hilltop setting offers panoramic views across the Cultural Triangle."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Dambulla_cave_temple.jpg/1280px-Dambulla_cave_temple.jpg",
    },
    {
        "name": "Kataragama Temple",
        "category": "Temples",
        "district": "Monaragala",
        "entrance_fee_usd": 0.0,
        "difficulty_level": "Easy",
        "description": (
            "A unique multi-religious pilgrimage site sacred to Buddhists, Hindus, "
            "Muslims, and indigenous Veddah people, Kataragama is one of Sri Lanka's "
            "most spiritually charged destinations. The Maha Devale shrine honours "
            "the war god Skanda-Murugan. Pilgrims cross the Menik Ganga river at "
            "dawn for ritual bathing. The July/August Esala festival features fire-"
            "walkers and kavadi dancers. Peacocks roam freely through the sacred "
            "complex."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Kataragama_temple.jpg/1280px-Kataragama_temple.jpg",
    },
    {
        "name": "Gangaramaya Temple",
        "category": "Temples",
        "district": "Colombo",
        "entrance_fee_usd": 3.00,
        "difficulty_level": "Easy",
        "description": (
            "A fascinating eclectic temple complex in the heart of Colombo beside "
            "Beira Lake, Gangaramaya blends Sri Lankan, Thai, Indian, and Chinese "
            "architectural styles. The museum inside contains a remarkable collection "
            "of gifts from Buddhist nations — Rolls Royces, ivory tusks, antique "
            "clocks, and countless Buddha statues. The Navam Perahera festival each "
            "February is one of Colombo's grandest spectacles with hundreds of "
            "decorated elephants."
        ),
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Gangaramaya_temple_Colombo.jpg/1280px-Gangaramaya_temple_Colombo.jpg",
    },
]


# ─────────────────────────────────────────────────────────────────
#  Step 1: PostgreSQL — DDL + Seed
# ─────────────────────────────────────────────────────────────────

CREATE_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS tourist_attractions (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(255)  NOT NULL,
    category         VARCHAR(100)  NOT NULL,
    district         VARCHAR(100)  NOT NULL,
    entrance_fee_usd FLOAT,
    difficulty_level VARCHAR(50),
    description      TEXT          NOT NULL,
    image_url        TEXT
);
"""

INSERT_SQL = """
INSERT INTO tourist_attractions
    (name, category, district, entrance_fee_usd, difficulty_level, description, image_url)
VALUES
    (:name, :category, :district, :entrance_fee_usd, :difficulty_level, :description, :image_url)
ON CONFLICT DO NOTHING
RETURNING id;
"""


def seed_postgres() -> dict[str, int]:
    """
    Create the table (if not exists) and seed all attractions.
    Returns a mapping of attraction name → DB id.
    """
    logger.info("=== Step 1: Seeding PostgreSQL ===")
    engine = create_engine(settings.sync_database_url, echo=False)
    name_to_id: dict[str, int] = {}

    with engine.begin() as conn:
        conn.execute(text(CREATE_TABLE_DDL))
        logger.info("Table tourist_attractions created/verified.")

        for attraction in tqdm(ATTRACTIONS, desc="Inserting attractions"):
            result = conn.execute(text(INSERT_SQL), attraction)
            row = result.fetchone()
            if row:
                name_to_id[attraction["name"]] = row[0]
            else:
                # Already exists — fetch the id
                existing = conn.execute(
                    text("SELECT id FROM tourist_attractions WHERE name = :name"),
                    {"name": attraction["name"]},
                ).fetchone()
                if existing:
                    name_to_id[attraction["name"]] = existing[0]

    logger.info("Seeded %d attractions into PostgreSQL.", len(name_to_id))
    return name_to_id


# ─────────────────────────────────────────────────────────────────
#  Step 2: Text Embeddings → Pinecone
# ─────────────────────────────────────────────────────────────────

def upsert_text_embeddings(name_to_id: dict[str, int]) -> None:
    """Encode descriptions with sentence-transformers and upsert to Pinecone."""
    logger.info("=== Step 2: Generating Text Embeddings (sentence-transformers) ===")

    model = SentenceTransformer("all-MiniLM-L6-v2")
    pc = Pinecone(api_key=settings.pinecone_api_key)

    # Create index if needed (dim=384)
    existing_indexes = {idx["name"] for idx in pc.list_indexes()}
    if settings.pinecone_text_index not in existing_indexes:
        logger.info("Creating Pinecone text index: %s", settings.pinecone_text_index)
        pc.create_index(
            name=settings.pinecone_text_index,
            dimension=384,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region=settings.pinecone_environment),
        )
        # Wait for index to be ready
        logger.info("Waiting for index to initialise...")
        time.sleep(10)

    index = pc.Index(settings.pinecone_text_index)

    vectors = []
    for attraction in tqdm(ATTRACTIONS, desc="Encoding text"):
        name = attraction["name"]
        if name not in name_to_id:
            continue
        attr_id = name_to_id[name]

        # Combine name + category + description for a richer embedding
        text_to_encode = (
            f"{attraction['name']}. {attraction['category']} in {attraction['district']}. "
            f"{attraction['description']}"
        )
        embedding = model.encode(text_to_encode, normalize_embeddings=True).tolist()

        vectors.append({
            "id": str(attr_id),
            "values": embedding,
            "metadata": {
                "name": name,
                "category": attraction["category"],
                "district": attraction["district"],
                "entrance_fee_usd": attraction.get("entrance_fee_usd") or 0.0,
                "difficulty_level": attraction.get("difficulty_level", ""),
            },
        })

    # Upsert in batches of 100
    batch_size = 100
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i : i + batch_size]
        index.upsert(vectors=batch)
        logger.info("Upserted text batch %d-%d", i, i + len(batch))

    logger.info("Text embeddings upserted: %d vectors.", len(vectors))


# ─────────────────────────────────────────────────────────────────
#  Step 3: Image Embeddings → Pinecone
# ─────────────────────────────────────────────────────────────────

def download_and_encode_image(image_url: str, preprocess, model, device: str) -> list[float] | None:
    """Download an image from URL and return its CLIP embedding."""
    try:
        response = requests.get(image_url, timeout=15)
        response.raise_for_status()
        image = Image.open(io.BytesIO(response.content)).convert("RGB")
        image_tensor = preprocess(image).unsqueeze(0).to(device)
        with torch.no_grad():
            embedding = model.encode_image(image_tensor)
            embedding = embedding / embedding.norm(dim=-1, keepdim=True)
        return embedding.squeeze().cpu().tolist()
    except Exception as exc:
        logger.warning("Failed to encode image %s: %s", image_url, exc)
        return None


def upsert_image_embeddings(name_to_id: dict[str, int]) -> None:
    """Encode attraction images with CLIP and upsert to Pinecone."""
    logger.info("=== Step 3: Generating Image Embeddings (CLIP ViT-B/32) ===")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info("Using device: %s", device)
    clip_model, preprocess = clip.load("ViT-B/32", device=device)

    pc = Pinecone(api_key=settings.pinecone_api_key)

    # Create index if needed (dim=512)
    existing_indexes = {idx["name"] for idx in pc.list_indexes()}
    if settings.pinecone_image_index not in existing_indexes:
        logger.info("Creating Pinecone image index: %s", settings.pinecone_image_index)
        pc.create_index(
            name=settings.pinecone_image_index,
            dimension=512,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region=settings.pinecone_environment),
        )
        logger.info("Waiting for image index to initialise...")
        time.sleep(10)

    index = pc.Index(settings.pinecone_image_index)

    vectors = []
    for attraction in tqdm(ATTRACTIONS, desc="Encoding images"):
        name = attraction["name"]
        if name not in name_to_id or not attraction.get("image_url"):
            continue
        attr_id = name_to_id[name]
        image_url = attraction["image_url"]

        embedding = download_and_encode_image(
            image_url, preprocess, clip_model, device
        )
        if embedding is None:
            # Fallback: encode the attraction name+category as text via CLIP
            logger.info("Using CLIP text fallback for: %s", name)
            tokens = clip.tokenize([f"{name}, {attraction['category']}, Sri Lanka"]).to(device)
            with torch.no_grad():
                emb = clip_model.encode_text(tokens)
                emb = emb / emb.norm(dim=-1, keepdim=True)
            embedding = emb.squeeze().cpu().tolist()

        vectors.append({
            "id": str(attr_id),
            "values": embedding,
            "metadata": {
                "name": name,
                "category": attraction["category"],
                "district": attraction["district"],
                "image_url": image_url,
            },
        })

    # Upsert in batches
    batch_size = 100
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i : i + batch_size]
        index.upsert(vectors=batch)
        logger.info("Upserted image batch %d-%d", i, i + len(batch))

    logger.info("Image embeddings upserted: %d vectors.", len(vectors))


# ─────────────────────────────────────────────────────────────────
#  Main
# ─────────────────────────────────────────────────────────────────

def main() -> None:
    logger.info("╔══════════════════════════════════════════╗")
    logger.info("║        LankaRAG Data Ingestion           ║")
    logger.info("╚══════════════════════════════════════════╝")

    # Validate environment
    if not settings.pinecone_api_key:
        logger.error("PINECONE_API_KEY is not set. Check your .env file.")
        sys.exit(1)

    # Step 1: Seed PostgreSQL
    name_to_id = seed_postgres()

    # Step 2: Text embeddings → Pinecone
    upsert_text_embeddings(name_to_id)

    # Step 3: Image embeddings → Pinecone
    upsert_image_embeddings(name_to_id)

    logger.info("")
    logger.info("✅ Ingestion complete!")
    logger.info("   Attractions in PostgreSQL: %d", len(name_to_id))
    logger.info("   Run the backend: uvicorn main:app --reload")


if __name__ == "__main__":
    main()

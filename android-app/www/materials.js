// Drying data for a greenhouse-type solar dry house on a clear day.
// mi  = fresh moisture, % wet basis
// ms  = safe storage moisture, % wet basis
// me  = lowest moisture a solar dry house can reach (equilibrium), % wet basis
// t   = safe air temperature band, °C
// d   = days to reach safe storage moisture in the dry house (clear days)
// o   = days in open sun, for comparison
// load = tray loading, kg fresh per m² of tray
// keep = storage life in months, sealed
// These are typical guide values, not lab measurements.
export const CATEGORIES = [
  "Spices", "Leaves & herbs", "Flowers", "Fruits", "Vegetables",
  "Grains & pulses", "Nuts & plantation", "Fish & seafood", "Farm use",
];

export const MATERIALS = [
  // Spices
  { id: "red-chilli", name: "Red chilli", aka: ["Milagai", "Mirchi"], cat: "Spices", mi: 75, ms: 10, me: 2.5, t: [45, 55], d: [4, 6], o: [10, 15], load: 6, keep: 12,
    prep: "Whole pods with stalks on. Remove rotten, black or white-patched pods.",
    done: "Pods rattle and snap when bent; seeds move freely inside.",
    tip: "Above 55 °C the red colour turns brown — open the vents at noon." },
  { id: "turmeric", name: "Turmeric", aka: ["Manjal", "Haldi"], cat: "Spices", mi: 78, ms: 10, me: 2.5, t: [55, 60], d: [7, 10], o: [15, 20], load: 15, keep: 12,
    prep: "Boil or steam the rhizomes 45–60 min until a stick pierces them easily. Dry whole or sliced.",
    done: "Breaks with a sharp metallic snap; bright yellow inside.",
    tip: "Slicing to 5 mm cuts drying time roughly in half." },
  { id: "ginger", name: "Ginger slices", aka: ["Inji", "Adrak", "Sukku"], cat: "Spices", mi: 82, ms: 10, me: 2.5, t: [50, 55], d: [2, 3], o: [8, 10], load: 8, keep: 12,
    prep: "Wash, peel, slice 5 mm.", done: "Slices snap cleanly with no soft core.",
    tip: "Whole rhizomes (sukku) take 6–8 days." },
  { id: "black-pepper", name: "Black pepper", aka: ["Milagu", "Kali mirch"], cat: "Spices", mi: 70, ms: 11, me: 3, t: [45, 55], d: [3, 5], o: [7, 10], load: 10, keep: 18,
    prep: "Separate berries from spikes. Dip in boiling water for 1 minute for even black colour.",
    done: "Wrinkled, black, hard; a berry cracks between the teeth.",
    tip: "Blanching also kills mould spores and speeds drying." },
  { id: "cardamom", name: "Cardamom", aka: ["Elakkai", "Elaichi"], cat: "Spices", mi: 80, ms: 10, me: 3, t: [45, 50], d: [2, 3], o: [5, 7], load: 5, keep: 12,
    prep: "Wash capsules, drain well. Spread thin.",
    done: "Capsules are firm and green; seeds black and hard.",
    tip: "Stay under 50 °C to keep the green colour that sets the price." },
  { id: "coriander-seed", name: "Coriander seed", aka: ["Kothamalli vidhai", "Dhania"], cat: "Spices", mi: 30, ms: 9, me: 3, t: [40, 45], d: [1, 1], o: [3, 4], load: 15, keep: 12,
    prep: "Thresh, clean out stalks and soil.", done: "Seeds split easily; no green tinge.",
    tip: "High heat drives off the aroma oil — keep it mild." },
  { id: "garlic", name: "Garlic slices", aka: ["Poondu", "Lehsun"], cat: "Spices", mi: 65, ms: 6, me: 2, t: [50, 55], d: [2, 2], o: [5, 6], load: 6, keep: 12,
    prep: "Peel cloves, slice 3 mm. Dry apart from other produce.", done: "Crisp chips that snap.",
    tip: "Strong smell — never dry with fruit or leaves." },
  { id: "tamarind", name: "Tamarind", aka: ["Puli", "Imli"], cat: "Spices", mi: 35, ms: 18, me: 10, t: [45, 55], d: [3, 4], o: [6, 8], load: 10, keep: 12,
    prep: "Shell pods, remove fibre and seeds, spread pulp thin.", done: "Pulp is firm and not sticky to touch.",
    tip: "Sugary pulp never gets brittle — 3% is not possible." },

  // Leaves & herbs
  { id: "curry-leaves", name: "Curry leaves", aka: ["Kariveppilai", "Kadi patta"], cat: "Leaves & herbs", mi: 65, ms: 8, me: 2, t: [40, 45], d: [1, 1], o: [3, 4], load: 2, keep: 6,
    prep: "Strip from stems, wash, drain completely.", done: "Crumbles between fingers but still green.",
    tip: "Cover the tray with thin cotton cloth to keep colour." },
  { id: "moringa", name: "Moringa leaves", aka: ["Murungai keerai", "Drumstick leaves"], cat: "Leaves & herbs", mi: 78, ms: 7, me: 2, t: [40, 50], d: [1, 2], o: [3, 5], load: 2, keep: 6,
    prep: "Strip leaflets, wash, drain or spin dry.", done: "Crisp and crumbly; deep green, not brown.",
    tip: "Powder only after it cools fully, or it cakes." },
  { id: "mint", name: "Mint", aka: ["Pudina"], cat: "Leaves & herbs", mi: 85, ms: 8, me: 2, t: [35, 40], d: [1, 2], o: [3, 4], load: 2, keep: 6,
    prep: "Pick leaves, wash, drain.", done: "Leaves crumble; strong smell remains.",
    tip: "Above 40 °C the oil escapes and the smell goes flat." },
  { id: "coriander-leaves", name: "Coriander leaves", aka: ["Kothamalli", "Dhania patta"], cat: "Leaves & herbs", mi: 87, ms: 8, me: 2, t: [35, 40], d: [1, 2], o: [3, 4], load: 2, keep: 6,
    prep: "Remove roots, wash, drain, chop coarse.", done: "Crumbles to green flakes.", tip: "Dry in the shaded corner of the house." },
  { id: "tulsi", name: "Holy basil", aka: ["Tulsi", "Thulasi"], cat: "Leaves & herbs", mi: 80, ms: 8, me: 2, t: [35, 40], d: [1, 2], o: [3, 4], load: 2, keep: 6,
    prep: "Pick leaves and tender tips, wash, drain.", done: "Brittle leaves, aroma intact.", tip: "" },
  { id: "neem", name: "Neem leaves", aka: ["Vembu", "Veppilai"], cat: "Leaves & herbs", mi: 65, ms: 8, me: 2, t: [40, 45], d: [1, 1], o: [3, 4], load: 2, keep: 12,
    prep: "Strip leaves, wash, drain.", done: "Crumbles to powder.", tip: "" },
  { id: "fenugreek-leaves", name: "Fenugreek leaves", aka: ["Vendhaya keerai", "Kasuri methi"], cat: "Leaves & herbs", mi: 85, ms: 8, me: 2, t: [40, 45], d: [1, 2], o: [3, 4], load: 2, keep: 6,
    prep: "Pick leaves, wash, drain.", done: "Crumbles; stays green.", tip: "" },
  { id: "drumstick-pods", name: "Drumstick pods", aka: ["Murungakkai"], cat: "Vegetables", mi: 86, ms: 8, me: 2.5, t: [50, 55], d: [2, 3], o: [5, 6], load: 6, keep: 6,
    prep: "Cut into 5 cm pieces, blanch 2 minutes, split lengthwise.", done: "Pieces are brittle and light.", tip: "" },

  // Flowers
  { id: "rose", name: "Rose petals", aka: ["Roja", "Gulab"], cat: "Flowers", mi: 80, ms: 8, me: 2, t: [35, 40], d: [1, 2], o: [3, 4], load: 1.5, keep: 6,
    prep: "Separate petals, discard bruised ones. No washing.", done: "Papery and crisp.", tip: "Cover with thin cloth — direct light bleaches them." },
  { id: "marigold", name: "Marigold", aka: ["Saamanthi", "Genda"], cat: "Flowers", mi: 85, ms: 10, me: 3, t: [45, 50], d: [2, 3], o: [6, 8], load: 3, keep: 6,
    prep: "Remove stalks; pull petals for faster drying.", done: "Petals crumble, colour stays orange.", tip: "Used for natural dye and poultry feed." },
  { id: "hibiscus", name: "Hibiscus flowers", aka: ["Semparuthi", "Gudhal"], cat: "Flowers", mi: 85, ms: 10, me: 3, t: [40, 45], d: [2, 2], o: [4, 5], load: 2, keep: 6,
    prep: "Remove stalk and stamen, open the petals flat.", done: "Papery and crisp.", tip: "" },

  // Fruits
  { id: "mango", name: "Mango slices", aka: ["Maambazham", "Aam"], cat: "Fruits", mi: 82, ms: 14, me: 8, t: [55, 60], d: [2, 2], o: [5, 7], load: 8, keep: 6,
    prep: "Ripe but firm fruit. Peel, slice 6–8 mm. Optional dip in lemon water.", done: "Leathery and bendy, no wet spot when torn.",
    tip: "Fruit sugar holds water — it never dries below about 8%." },
  { id: "banana", name: "Banana slices", aka: ["Vaazhaippazham", "Kela"], cat: "Fruits", mi: 75, ms: 16, me: 8, t: [55, 60], d: [2, 3], o: [6, 8], load: 8, keep: 6,
    prep: "Ripe bananas, slice 5 mm, dip in lemon water to stop browning.", done: "Leathery, slightly tacky, no juice when squeezed.", tip: "" },
  { id: "grapes", name: "Grapes → raisins", aka: ["Thiratchai", "Kishmish"], cat: "Fruits", mi: 80, ms: 16, me: 10, t: [50, 55], d: [7, 10], o: [15, 20], load: 10, keep: 12,
    prep: "Dip in hot water for 30 seconds, or in a 2% potassium carbonate + oil dip, to crack the wax.", done: "Wrinkled, soft, no juice when pressed.", tip: "" },
  { id: "jackfruit", name: "Jackfruit bulbs", aka: ["Palaappazham", "Kathal"], cat: "Fruits", mi: 75, ms: 12, me: 7, t: [55, 60], d: [2, 3], o: [6, 8], load: 8, keep: 6,
    prep: "Remove seeds, cut bulbs into strips.", done: "Leathery, golden, not sticky.", tip: "" },
  { id: "papaya", name: "Papaya slices", aka: ["Pappaali", "Papita"], cat: "Fruits", mi: 88, ms: 14, me: 8, t: [55, 60], d: [2, 3], o: [5, 7], load: 8, keep: 6,
    prep: "Peel, de-seed, slice 6 mm.", done: "Leathery, no wet centre.", tip: "" },
  { id: "pineapple", name: "Pineapple slices", aka: ["Annaasi", "Ananas"], cat: "Fruits", mi: 86, ms: 14, me: 8, t: [55, 60], d: [2, 3], o: [6, 8], load: 8, keep: 6,
    prep: "Peel, core, slice 6 mm rings.", done: "Leathery and bendy.", tip: "" },
  { id: "amla", name: "Amla (gooseberry)", aka: ["Nellikai", "Amla"], cat: "Fruits", mi: 85, ms: 10, me: 5, t: [50, 55], d: [2, 3], o: [5, 7], load: 8, keep: 12,
    prep: "Steam 5 minutes, remove seeds, cut into segments.", done: "Hard and brittle.", tip: "Keep under 55 °C to save the vitamin C." },
  { id: "sapota", name: "Sapota slices", aka: ["Sapota", "Chikoo"], cat: "Fruits", mi: 74, ms: 14, me: 8, t: [55, 60], d: [2, 3], o: [6, 8], load: 8, keep: 6,
    prep: "Peel, de-seed, slice 6 mm.", done: "Leathery, no wet spots.", tip: "" },
  { id: "figs", name: "Figs", aka: ["Athi", "Anjeer"], cat: "Fruits", mi: 80, ms: 18, me: 10, t: [50, 55], d: [3, 4], o: [7, 10], load: 8, keep: 12,
    prep: "Halve ripe figs, place cut side up.", done: "Soft, chewy, no juice.", tip: "" },
  { id: "dates", name: "Dates", aka: ["Pericham pazham", "Khajoor"], cat: "Fruits", mi: 50, ms: 20, me: 12, t: [50, 60], d: [3, 5], o: [7, 10], load: 12, keep: 12,
    prep: "Wash, drain, spread whole.", done: "Wrinkled skin, firm flesh.", tip: "" },
  { id: "apple", name: "Apple rings", aka: ["Seb"], cat: "Fruits", mi: 85, ms: 15, me: 8, t: [55, 60], d: [2, 2], o: [4, 6], load: 8, keep: 6,
    prep: "Core, slice 5 mm rings, dip in lemon water.", done: "Leathery rings, bendy.", tip: "" },
  { id: "citrus-peel", name: "Lemon & orange peel", aka: ["Elumichai thol", "Orange thol"], cat: "Fruits", mi: 75, ms: 8, me: 3, t: [50, 55], d: [1, 2], o: [3, 4], load: 5, keep: 12,
    prep: "Remove the white pith, cut into strips.", done: "Strips snap.", tip: "" },

  // Vegetables
  { id: "tomato", name: "Tomato slices", aka: ["Thakkali", "Tamatar"], cat: "Vegetables", mi: 94, ms: 9, me: 3, t: [55, 60], d: [2, 3], o: [6, 8], load: 8, keep: 6,
    prep: "Firm ripe tomatoes, slice 6–8 mm, sprinkle a little salt.", done: "Leathery to brittle, deep red.", tip: "" },
  { id: "onion", name: "Onion slices", aka: ["Vengaayam", "Pyaaz"], cat: "Vegetables", mi: 86, ms: 6, me: 2, t: [50, 55], d: [2, 2], o: [5, 7], load: 6, keep: 12,
    prep: "Peel, slice 3–5 mm. Dry apart from other produce.", done: "Brittle; pale cream colour.", tip: "Above 60 °C it browns and turns bitter." },
  { id: "potato", name: "Potato chips", aka: ["Urulaikizhangu", "Aloo"], cat: "Vegetables", mi: 80, ms: 7, me: 2, t: [55, 60], d: [1, 2], o: [3, 5], load: 8, keep: 12,
    prep: "Peel, slice 3 mm, blanch 3 minutes, drain.", done: "Glassy and brittle.", tip: "" },
  { id: "carrot", name: "Carrot", aka: ["Carrot", "Gajar"], cat: "Vegetables", mi: 88, ms: 6, me: 2, t: [55, 60], d: [1, 2], o: [4, 5], load: 8, keep: 12,
    prep: "Peel, dice or slice 5 mm, blanch 3 minutes.", done: "Hard and leathery to brittle.", tip: "" },
  { id: "bitter-gourd", name: "Bitter gourd", aka: ["Pavakkai", "Karela"], cat: "Vegetables", mi: 92, ms: 6, me: 2, t: [50, 55], d: [1, 2], o: [3, 4], load: 6, keep: 12,
    prep: "Slice into 5 mm rounds, remove seeds. Optional salt-and-buttermilk soak for vathal.", done: "Crisp rings.", tip: "" },
  { id: "okra", name: "Okra", aka: ["Vendakkai", "Bhindi"], cat: "Vegetables", mi: 90, ms: 7, me: 2, t: [50, 55], d: [1, 2], o: [3, 5], load: 6, keep: 12,
    prep: "Cut into 1 cm rounds, blanch 2 minutes.", done: "Brittle and light.", tip: "" },
  { id: "cluster-beans", name: "Cluster beans", aka: ["Kothavarangai", "Gawar"], cat: "Vegetables", mi: 85, ms: 8, me: 2.5, t: [50, 55], d: [2, 2], o: [4, 5], load: 6, keep: 12,
    prep: "Blanch in salted water 3 minutes (for vathal, soak in salted buttermilk).", done: "Crisp, snaps.", tip: "" },
  { id: "mushroom", name: "Mushroom", aka: ["Kaalan", "Khumb"], cat: "Vegetables", mi: 90, ms: 6, me: 2, t: [50, 55], d: [1, 1], o: [2, 3], load: 5, keep: 12,
    prep: "Clean with a dry cloth, slice 5 mm.", done: "Leathery to crisp.", tip: "" },
  { id: "tapioca", name: "Tapioca chips", aka: ["Maravalli kizhangu", "Kappa"], cat: "Vegetables", mi: 65, ms: 12, me: 4, t: [55, 60], d: [1, 2], o: [3, 4], load: 15, keep: 12,
    prep: "Peel, slice 5 mm, parboil 5 minutes.", done: "Chalky white, snaps.", tip: "" },
  { id: "green-peas", name: "Green peas", aka: ["Pachai pattani", "Matar"], cat: "Vegetables", mi: 75, ms: 6, me: 2, t: [55, 60], d: [1, 2], o: [3, 4], load: 10, keep: 12,
    prep: "Shell, blanch 2 minutes, drain.", done: "Wrinkled and hard.", tip: "" },

  // Grains & pulses
  { id: "paddy", name: "Paddy", aka: ["Nel", "Dhaan"], cat: "Grains & pulses", mi: 22, ms: 13, me: 5, t: [38, 42], d: [1, 2], o: [2, 3], load: 25, keep: 12,
    prep: "Clean grain, spread 3–4 cm deep. Stir twice a day.", done: "Grain cracks cleanly between the teeth.",
    tip: "For seed paddy never go above 40 °C or germination drops." },
  { id: "maize", name: "Maize", aka: ["Makka cholam", "Makka"], cat: "Grains & pulses", mi: 28, ms: 12, me: 5, t: [45, 55], d: [2, 3], o: [4, 6], load: 25, keep: 12,
    prep: "Shell cobs, spread grain in a thin layer.", done: "Grain is hard; a fingernail leaves no dent.", tip: "Seed maize: keep under 40 °C." },
  { id: "millets", name: "Millets", aka: ["Ragi", "Kambu", "Cholam"], cat: "Grains & pulses", mi: 20, ms: 12, me: 5, t: [40, 50], d: [1, 1], o: [2, 3], load: 25, keep: 12,
    prep: "Thresh and clean.", done: "Grain is hard and rattles.", tip: "" },
  { id: "pulses", name: "Pulses", aka: ["Paruppu", "Dal", "Ulundhu", "Thuvarai"], cat: "Grains & pulses", mi: 18, ms: 10, me: 5, t: [40, 45], d: [1, 1], o: [2, 2], load: 25, keep: 12,
    prep: "Thresh pods, clean.", done: "Seeds split cleanly.", tip: "" },
  { id: "sesame", name: "Sesame", aka: ["Ellu", "Til"], cat: "Grains & pulses", mi: 20, ms: 7, me: 2, t: [40, 45], d: [1, 1], o: [2, 3], load: 15, keep: 12,
    prep: "Stack plants upright to open pods, then shake out seed.", done: "Seeds flow freely and feel dry.", tip: "" },

  // Nuts & plantation
  { id: "copra", name: "Copra (coconut)", aka: ["Kopparai", "Thengai"], cat: "Nuts & plantation", mi: 52, ms: 6, me: 2, t: [50, 60], d: [3, 4], o: [6, 8], load: 18, keep: 12,
    prep: "Split mature nuts. Dry cup side down on day one, then scoop out the kernel.", done: "Kernel comes away from the shell and snaps.",
    tip: "Over 6% moisture grows aflatoxin mould; keep it moving." },
  { id: "groundnut", name: "Groundnut pods", aka: ["Verkadalai", "Moongphali"], cat: "Nuts & plantation", mi: 38, ms: 8, me: 2.5, t: [40, 45], d: [2, 3], o: [4, 6], load: 20, keep: 12,
    prep: "Strip pods from the plants, shake off soil.", done: "Kernels rattle in the pod; skin peels easily.", tip: "" },
  { id: "cashew", name: "Raw cashew nuts", aka: ["Mundhiri", "Kaju"], cat: "Nuts & plantation", mi: 25, ms: 8, me: 3, t: [45, 50], d: [2, 3], o: [3, 5], load: 20, keep: 12,
    prep: "Separate nuts from the apple, wash off sap.", done: "Nuts rattle in the shell.", tip: "" },
  { id: "areca", name: "Areca nut", aka: ["Paakku", "Supari"], cat: "Nuts & plantation", mi: 50, ms: 12, me: 5, t: [50, 60], d: [6, 8], o: [35, 45], load: 20, keep: 12,
    prep: "Whole ripe nuts, or split for faster drying.", done: "Husk is dark and the kernel rattles.", tip: "Split nuts dry in 3–4 days." },
  { id: "coffee", name: "Coffee cherries", aka: ["Kaapi"], cat: "Nuts & plantation", mi: 60, ms: 11, me: 5, t: [40, 45], d: [5, 7], o: [12, 20], load: 20, keep: 12,
    prep: "Sort ripe red cherries, spread 3–4 cm deep, rake 3 times a day.", done: "Beans rattle inside the dried cherry.", tip: "" },
  { id: "cocoa", name: "Cocoa beans", aka: ["Cocoa"], cat: "Nuts & plantation", mi: 55, ms: 7, me: 3, t: [50, 60], d: [3, 4], o: [6, 8], load: 15, keep: 12,
    prep: "Ferment 5–6 days first, then spread 5 cm deep.", done: "Bean cracks; brown inside.", tip: "" },

  // Fish & seafood
  { id: "salted-fish", name: "Salted fish", aka: ["Karuvadu", "Sukhi machhli"], cat: "Fish & seafood", mi: 75, ms: 18, me: 10, t: [45, 55], d: [2, 3], o: [4, 6], load: 10, keep: 6,
    prep: "Gut, clean, salt (1 kg salt per 3–4 kg fish) for 12–24 h, rinse. Dry on its own.", done: "Firm, no soft spots near the backbone.",
    tip: "Salt holds water — salted fish never gets below about 10%." },
  { id: "anchovy", name: "Anchovy", aka: ["Nethili karuvadu"], cat: "Fish & seafood", mi: 78, ms: 15, me: 6, t: [45, 55], d: [1, 2], o: [2, 3], load: 8, keep: 6,
    prep: "Wash in brine, drain, spread single layer.", done: "Stiff, snaps when bent.", tip: "" },
  { id: "prawns", name: "Prawns", aka: ["Eraal", "Jhinga"], cat: "Fish & seafood", mi: 75, ms: 12, me: 5, t: [50, 55], d: [1, 2], o: [3, 4], load: 8, keep: 6,
    prep: "Boil in salted water 5 minutes, drain.", done: "Hard and shell peels off easily.", tip: "" },

  // Farm use
  { id: "fodder", name: "Green fodder (hay)", aka: ["Theevanam", "Chara"], cat: "Farm use", mi: 78, ms: 15, me: 6, t: [40, 50], d: [2, 3], o: [4, 6], load: 5, keep: 6,
    prep: "Chop to 5–10 cm; wilt in the field for half a day first.", done: "Stems snap, leaves stay green, no musty smell.", tip: "" },
  { id: "azolla", name: "Azolla", aka: ["Azolla"], cat: "Farm use", mi: 92, ms: 10, me: 4, t: [40, 50], d: [1, 2], o: [3, 4], load: 3, keep: 6,
    prep: "Rinse well, drain in a mesh bag.", done: "Crumbles to a green powder.", tip: "Dried azolla is a protein feed for poultry and goats." },
  { id: "cow-dung", name: "Cow dung cakes", aka: ["Varatti", "Upla"], cat: "Farm use", mi: 80, ms: 15, me: 6, t: [40, 65], d: [3, 5], o: [7, 10], load: 20, keep: 12,
    prep: "Shape into 2 cm thick cakes on the floor area, not on food trays.", done: "Light, hard and hollow-sounding.", tip: "Never dry with food in the same batch." },
];

// Moisture on a dry-weight basis (kg water per kg dry matter).
const db = (m) => m / (100 - m);

// Days to reach a target moisture on clear days, from the exponential drying curve
// fitted through (fresh, 0 days) and (safe moisture, typical days).
// Returns null when the target is at or below what the dry house can reach.
export function daysTo(mat, target) {
  if (target >= mat.mi) return 0;
  if (target <= mat.me) return null;
  const X0 = db(mat.mi), Xs = db(mat.ms), Xe = db(mat.me), Xt = db(target);
  const ref = (mat.d[0] + mat.d[1]) / 2;
  const k = Math.log((X0 - Xe) / (Xs - Xe)) / ref;
  return Math.log((X0 - Xe) / (Xt - Xe)) / k;
}

// Kilograms of dried product from a fresh weight.
export const driedWeight = (kg, mi, mf) => (kg * (100 - mi)) / (100 - mf);

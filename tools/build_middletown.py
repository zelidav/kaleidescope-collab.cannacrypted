#!/usr/bin/env python3
"""Fill in the strain list for the Sept 2026 Middletown drop.

Source of record is the cultivator's 30-cultivar offer sheet plus the breeder /
category research done against it. Confidence tiers are load-bearing:

  1 = lineage documented well enough to print on a tag today
  2 = family confirmed, the exact cross varies by grower -- print the family, not the cross
  3 = in-house or numbered selection with no public documentation -- print nothing until
      the cultivator answers

Tier 3 is not a quality judgment. Terpenes are deliberately left EMPTY on anything
without a panel rather than guessed, because a fabricated terp list is the one thing on
this page that could end up on a printed label.

Usage: python tools/build_middletown.py   (rewrites data/middletown_2026_09.json)
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "middletown_2026_09.json")
DROP = "middletown-2026-09"


def s(name, **kw):
    d = {
        "id": name.lower().replace(" ", "-").replace("#", "").replace("(", "")
                  .replace(")", "").replace("_", "-").replace("--", "-").strip("-"),
        "name": name, "drop": DROP, "type": "Unassigned", "tier": 3, "family": "",
        "breeder": "Needs confirmation", "lineage": "Needs confirmation",
        "credential": "", "terpenes": [], "aroma": "", "thc": "", "look": "",
        "effect": "", "specs": "", "position": "", "posShort": "", "posLong": "",
        "budtender": [], "needs": "", "flag": "", "notes": "", "sources": [], "image": "",
    }
    d.update(kw)
    return d


T1 = []  # documented -- full writeups

T1.append(s(
    "Blue Dream", type="Sativa", tier=1, family="Sativa",
    breeder="West Coast origin, breeder undocumented",
    lineage="Blueberry × Haze",
    terpenes=["Myrcene", "Pinene", "Caryophyllene"],
    aroma="Sweet blueberry over herbal haze, with a light peppery edge underneath.",
    thc="High teens to low twenties",
    look="Loose, sativa-structured flower. Bright green with amber pistils and even trichome coverage.",
    effect="Gentle, functional lift. Even and steady rather than sharp.",
    specs="9–10 weeks.",
    position="Sativa jar, volume tier — name recognition",
    posShort="Blueberry over herbal haze with a peppery edge. Bright, loose-structured flower. A steady, functional lift. Indoor-grown.",
    posLong="The most requested sativa name in American cannabis, and for good reason — Blueberry crossed to Haze produces sweet berry over an herbal, almost incense-like base, with a peppery note underneath that keeps it from going flat. The effect is steady and functional rather than sharp: a clean lift that stays even. Most Blue Dream on shelves is grown outdoors and shows it. This one is indoor, and the difference is in the trichome coverage and the intensity of the berry.",
    budtender=[
        "Highest name recognition of anything on our menu. Customers ask for it directly.",
        "Potency runs lower than most of our list — set expectations, then point out that terpene expression and smoothness are the reason people keep buying it.",
        "The indoor angle is the differentiator. Most Blue Dream in market is outdoor.",
        "Good entry point for a customer who is new or coming back after a long gap.",
    ],
    notes="Out of fashion in connoisseur circles for years and lower potency than the modern list around it. Neither matters much — it sells because customers ask for it by name, and a well-grown indoor Blue Dream is something most markets only carry as mediocre outdoor.",
))

T1.append(s(
    "Head Crack", type="Sativa*", tier=1, family="Sativa",
    breeder="Breeder undocumented",
    lineage="Headband × Green Crack",
    terpenes=[],
    aroma="Pungent and earthy with skunk, herbal and spicy notes. Diesel from the Headband side.",
    thc="Pending",
    look="Bright green, sometimes with yellow highlights. Rust-orange pistils, amber trichome dusting. Medium to large semi-dense flower.",
    effect="Cerebral and stimulating. Alert and social.",
    specs="Pending",
    position="Second sativa slot — pending COA",
    flag="Category contested — panel decides",
    posShort="Pungent earth and skunk with herbal, spicy notes and a diesel backbone. Bright green with rust pistils. Cerebral and alert.",
    posLong="Headband crossed to Green Crack — one of the few genuine sativa parents in circulation. The nose is pungent and earthy, skunk forward, with herbal and spicy notes and diesel showing through from the Headband side. Sharp on the inhale, with the spice coming out on the exhale. The effect is mental rather than physical: alert, engaged, sociable. Bright green flower with rust-colored pistils and an amber dusting of trichomes.",
    budtender=[
        "Category placement is provisional pending the terpene panel.",
        "Not a dessert or candy profile. Recommend it to the customer who says they're tired of sweet.",
        "Green Crack heritage is the selling point for anyone who knows the name.",
        "Pair with Blue Dream as our daytime shelf.",
    ],
    notes="Sources split hard on this one: some list it sativa-leaning and cerebral, others 70/30 indica-dominant with strong appetite effects. That split is real and probably reflects different cuts. Limonene or pinene forward and sativa holds; myrcene-dominant and it moves to hybrid.",
    needs="Terpene panel — it decides the jar.",
))

T1.append(s(
    "Hash Burger", type="Indica", tier=1, family="Gas / funk",
    breeder="Skunk House Genetics / Mr. & Mrs. Respect",
    lineage="Han Solo Hash Plant × Double Burger",
    credential="Leafly Strain of the Year 2025 · Silver, 2024 California State Fair Cannabis Awards",
    terpenes=["Caryophyllene", "Limonene", "Myrcene"],
    aroma="Savory rather than sweet — garlic, onion, umami and ammonia funk over deep earth. GMO, Donny Burger and Triangle Kush heritage all show.",
    thc="28–35% THCa",
    look="Dense colas with tight calyx stacking and minimal foxtailing. Exceptional resin coverage.",
    effect="Heavy and settling. Evening cultivar.",
    specs="±63 days.",
    position="Top shelf — flagship",
    posShort="Garlic, onion and deep earth over ammonia funk. Leafly Strain of the Year 2025. Dense, resin-heavy, and genuinely loud.",
    posLong="Named Leafly's Strain of the Year for 2025, and it earned it by going the opposite direction from everything else on the shelf. Han Solo Hash Plant crossed to Double Burger, out of the Skunk House lineage — this is savory, not sweet. Garlic, onion, umami and a deep ammonia funk over earth, with the GMO and Triangle Kush heritage showing plainly. Commonly tests between 28 and 35 percent. Dense colas, tight calyx stacking, and resin coverage heavy enough that it's a serious candidate for washing. An evening cultivar that does not apologize for it.",
    budtender=[
        "Lead with the 2025 Leafly award — it's recent enough that customers have heard of it.",
        "Warn people it's savory. Someone expecting fruit will be startled. Someone who wants funk will be delighted.",
        "This is the flagship. If a customer asks what's best on the menu, this is the answer.",
        "Strong recommendation for anyone who likes GMO, Donny Burger, or the Chem family.",
        "Mention the resin if they're into solventless — it washes exceptionally.",
    ],
    notes="The Burger family has overlapping naming. Skunk House lists it as (Han Solo Burger × Black Triangle Kush) × Double Burger; other listings simplify to Han Solo Hash Plant × Double Burger. Same plant, different shorthand — both are fine to print. Bred by California Seed Bank's Respect and Mrs. Respect during a now-dissolved partnership with Skunk House's Skunk Master Flex.",
    needs="Which cut, and has this cut competed?",
))

T1.append(s(
    "Permanent Marker", type="Indica", tier=1, family="Headliner",
    breeder="Seed Junky Genetics",
    lineage="Biscotti × Jealousy × Sherb Bx",
    credential="Leafly Strain of the Year 2023",
    terpenes=["Caryophyllene", "Limonene", "Linalool"],
    aroma="Sharp, clean and chemical — soapy-floral up top with a gassy body underneath. Distinctive enough that it doesn't resemble anything else on a shelf.",
    thc="High",
    look="Tight structure with a heavy trichome load. Strong purple expression on some cuts.",
    effect="Settling and physical, with a bright front end.",
    specs="8–9 weeks.",
    position="Top shelf — award anchor",
    posShort="Sharp, clean and chemical — soapy-floral over gas. Leafly Strain of the Year 2023. Tight, frosted, unmistakable.",
    posLong="Seed Junky's 2023 Strain of the Year, from the same house that produced Wedding Cake and Ice Cream Cake. Biscotti crossed with Jealousy and a Sherb backcross, and the result smells like nothing else in the case — sharp and clean, almost chemical, a soapy-floral top note sitting over a gassy body. Tight structure, heavy trichome load, and real purple on the right cut. The front end is bright before it settles into something physical.",
    budtender=[
        "Second award anchor alongside Hash Burger — and the two share no common ground on nose, which is why we carry both.",
        "The nose is polarizing in a good way. Have people smell it before they decide.",
        "Same breeding house as Wedding Cake — good hook for customers who know that name.",
        "Position at the top of the shelf. It supports premium pricing on credential alone.",
    ],
    notes="Same house as Ice Cream Cake. Also the parent used in our own Scented Marker (ZM8) cross — internal context, not customer-facing copy.",
))

T1.append(s(
    "Gelato 33", type="Indica", tier=1, family="Dessert",
    breeder="Cookie Fam",
    lineage="Sunset Sherbet × Thin Mint GSC",
    credential="Foundational dessert pheno — also known as Larry Bird",
    terpenes=["Limonene", "Caryophyllene"],
    aroma="Sherbet-citrus over a creamy, earthy base. The original Gelato expression.",
    thc="High",
    look="Dense and trichome-heavy with purple flecking through the calyxes.",
    effect="Balanced, leaning settled. Even.",
    specs="8–9 weeks.",
    position="Top shelf — heritage",
    posShort="Sherbet-citrus over creamy earth. The original Gelato pheno, also known as Larry Bird. Dense and frost-heavy.",
    posLong="Also called Larry Bird, and the pheno that the entire Gelato line was built on. Sunset Sherbet crossed to Thin Mint GSC out of the Cookie Fam program — citrus and sherbet up top, creamy earth underneath, limonene forward with caryophyllene behind it. Dense flower, heavy trichome coverage, purple flecking through the calyxes. Most of what's on any modern menu descends from this plant. Worth carrying the original.",
    budtender=[
        "Heritage angle: half the menu descends from this. Customers who like Gelato crosses should try the source.",
        "Elite legacy name that still supports top-shelf pricing.",
        "Balanced enough to recommend to someone who doesn't want to be flattened.",
        "Easy recommendation — nearly universal appeal, very few people dislike it.",
    ],
    notes="Technically an indica-leaning hybrid. Shelved indica because that's how customers experience it — if the POS enforces a strict 70/30 threshold for hybrid, this one moves.",
))

T1.append(s(
    "Banana Punch", type="Indica", tier=1, family="Fruit / citrus",
    breeder="Breeder varies by cut",
    lineage="Banana OG × Purple Punch",
    terpenes=["Myrcene", "Caryophyllene", "Limonene"],
    aroma="Tropical banana over grape, with a creamy finish.",
    thc="Mid-to-high",
    look="Dense and colorful, purple expression from the Punch side.",
    effect="Settled and physical.",
    specs="8–9 weeks.",
    position="Mid shelf — fruit lane",
    posShort="Tropical banana over grape with a creamy finish. Dense, colorful flower. Settled and physical.",
    posLong="Banana OG crossed to Purple Punch — tropical banana at the front, grape underneath from the Punch side, and a creamy finish that ties the two together. Dense, colorful flower with strong purple expression. The effect is physical and unhurried, which is what the Purple Punch side contributes. Approachable and recognizable without being another Gelato cross.",
    budtender=[
        "Fruit-forward without being in the candy register — different lane from our Z-family cultivars.",
        "Purple Punch name recognition helps; a lot of customers know it.",
        "Good mid-shelf recommendation for someone who wants flavor but doesn't want to spend top dollar.",
    ],
))

PACK_MULE = dict(
    type="Indica", tier=1, family="Gas / funk",
    breeder="GenefinderOG",
    lineage="Oreoz × Mule Fuel",
    terpenes=["Caryophyllene", "Myrcene", "Limonene"],
    aroma="Gas, diesel and skunk with a sweeter note and heavy funk underneath. A fuel-dough signature.",
    thc="High",
    look="Compact and dense with heavy trichome coverage and strong bag appeal from the Oreoz side.",
    effect="Primarily physical. Calm and unhurried at moderate doses.",
    specs="Mostly indica. 8–9 weeks.",
    position="Mid shelf — gas lane (carry ONE pheno)",
    flag="Pheno designation — pick one",
    posShort="Gas, diesel and skunk over heavy funk. Compact, dense, and loud. Oreoz crossed to Mule Fuel.",
    posLong="GenefinderOG built this by crossing their Oreoz cut to a proven Mule Fuel — the goal was to bring Mule Fuel's flavor and character onto Oreoz's structure and resilience. It worked. Gas, diesel and skunk up front with a funky, doughy base and enough sweetness to round it out. Compact dense flower with heavy trichome coverage. The effect is physical and unhurried rather than heady.",
    budtender=[
        "For the gas customer who doesn't want anything sweet.",
        "Oreoz heritage is the bag-appeal story — it's a good-looking plant.",
        "We carry one Pack Mule pheno, not both — see open questions.",
    ],
    needs="What separates #3 from #4? We also have Mule Fuel itself — three SKUs from one family.",
)
T1.append(s("Pack Mule #3", id="pack-mule-3", **PACK_MULE))
T1.append(s("Pack Mule #4", id="pack-mule-4", **PACK_MULE))

T1.append(s(
    "Original Glue (GG4)", id="original-glue", type="Hybrid", tier=1, family="Gas / funk",
    breeder="GG Strains",
    lineage="Chem's Sister × Sour Dubb × Chocolate Diesel",
    credential="Multiple Cannabis Cup wins",
    terpenes=["Caryophyllene", "Limonene", "Myrcene"],
    aroma="Sour and chemical with chocolate-diesel depth and pine underneath.",
    thc="High",
    look="Sticky to the point of being difficult to handle. Enormous resin production, pale green with vivid orange pistils.",
    effect="Balanced but weighted. Strong.",
    specs="8–9 weeks.",
    position="Top shelf — classic",
    posShort="Sour, chemical and pine with chocolate-diesel depth. Multiple Cannabis Cup winner. Resin so heavy it gums the scissors.",
    posLong="The strain that defined gas before dessert took over the market. Chem's Sister crossed with Sour Dubb and Chocolate Diesel, out of GG Strains, with multiple Cannabis Cup wins behind it. Sour and chemical up front, chocolate-diesel depth in the middle, pine underneath. The name comes from what it does to trimming equipment — the resin production is genuinely extreme. Pale green flower, vivid orange pistils, and a coating that makes it hard to break apart by hand.",
    budtender=[
        "The recognition play for experienced customers. This name predates the entire Gelato wave.",
        "Cup pedigree is real and worth citing — attribute it to the cultivar and GG Strains.",
        "The resin story sells itself. Let them see it.",
        "Recommend to anyone asking for something classic, or anyone burnt out on sweet profiles.",
    ],
))

T1.append(s(
    "Zoap", type="Hybrid", tier=1, family="Dessert",
    breeder="Breeder attribution varies",
    lineage="Rainbow Sherbet × Pink Guava",
    terpenes=["Limonene", "Caryophyllene", "Linalool"],
    aroma="Sweet, floral and earthy with citrus and the distinctive clean, soapy note the name references.",
    thc="High",
    look="Dense and compact. Deep green and purple with orange pistils and thick trichome coverage.",
    effect="Balanced and even.",
    specs="8–9 weeks.",
    position="Top shelf — novelty",
    posShort="Sweet, floral and earthy with citrus and a clean soapy note. Dense, colorful, heavily frosted. Genuinely distinctive.",
    posLong="Rainbow Sherbet crossed to Pink Guava, and one of the few genuinely new profiles to come out of the last few years. Sweet and floral over earth, with citrus running through it and a clean, almost soapy note that the name refers to directly — it's the thing people remember about it. Dense compact flower, deep green through purple, orange pistils, thick trichome coverage. Balanced and even in effect.",
    budtender=[
        "The novelty pick. It genuinely doesn't smell like the rest of the shelf.",
        "Have people smell it. The soapy note is polarizing and it's better to find out at the counter.",
        "Strong visual — good jar to open when someone is browsing.",
        "Recommend to the customer who says they've tried everything.",
    ],
    notes="Some sources give a longer lineage. Rainbow Sherbet × Pink Guava is the standard market attribution and safe to print.",
))

T1.append(s(
    "Gushmintz", type="Hybrid", tier=1, family="Dessert",
    breeder="Purple City Genetics",
    lineage="Kush Mints × F1 Durb × Gushers",
    terpenes=["Caryophyllene", "Limonene", "Linalool"],
    aroma="Cool mint over sweet berry with a doughy base underneath.",
    thc="High",
    look="Excellent structure with dense frosted flower and purple expression.",
    effect="Balanced, settling gradually.",
    specs="8–9 weeks.",
    position="Mid-upper shelf",
    posShort="Cool mint over sweet berry with a doughy base. Dense, frosted, well-structured. Purple City Genetics.",
    posLong="Purple City Genetics crossed Kush Mints with an F1 Durb and Gushers to make this one. Cool mint at the front, sweet berry through the middle, a doughy base underneath holding it together. The F1 Durb in the cross is worth noting — that's the Durban line that sits under most of the Cookies family, and it's one generation closer here than it usually is. Dense, well-structured, heavily frosted flower with good purple.",
    budtender=[
        "The Durban in the lineage is a real talking point — it's closer in this cross than in most.",
        "Mint is an unusual top note. Differentiates it from the rest of the sweet shelf.",
        "Purple City Genetics is a respected name with people who follow breeders.",
    ],
))

# ---- Tier 2: family confirmed, exact cross varies by grower ----
T2 = [
    s("Grape Gas", tier=2, family="Gas / funk",
      breeder="Several breeders run a Grape Gas",
      lineage="Family confirmed — grape × fuel",
      aroma="Grape and fuel.",
      notes="Compound Genetics' Grape Gasoline (Grape Pie × Jet Fuel Gelato) is the best-known version, but the name is used by more than one house.",
      needs="Which breeder's version is this?"),
    s("Mule Fuel", tier=2, family="Gas / funk",
      lineage="Parent line — confirm the cross and source",
      aroma="Diesel and skunk forward.",
      effect="Heavy body effect.",
      position="Gas lane — recommended build",
      notes="A parent line rather than a hype name. Carries less consumer recognition but a real quality reputation among growers. It is also the father of both Pack Mule phenos on this sheet.",
      needs="Confirm the cross and source."),
    s("Blue Nerdz", tier=2, family="Candy / Z",
      lineage="Nerdz line × blue/berry genetics — confirm the cross",
      terpenes=["Linalool", "Limonene"],
      aroma="Sweet grape-blue candy over a fuel base.",
      effect="Balanced.",
      position="Candy lane — recommended build",
      notes="Strong purple expression, sells well to younger demographics. Also appears on our bench list — same name, so confirm it is the same cut before we treat the copy as reusable.",
      needs="Confirm the cross."),
    s("ZxZ", tier=2, family="Candy / Z",
      lineage="Zkittlez × a Z-family selection — confirm",
      aroma="Expect concentrated Zkittlez character — tropical fruit candy.",
      position="Candy lane — recommended build",
      notes="Write it as \"Z family\" in copy rather than building graphics around the Zkittlez mark, which is actively enforced.",
      needs="Confirm the cross."),
    s("Applescotti", tier=2, family="Dessert",
      lineage="Apple Fritter × Biscotti by the naming convention — confirm",
      aroma="Pastry, apple, and the nutty coffee-cream Biscotti character.",
      position="Dessert lane — recommended build",
      needs="Confirm the cross."),
    s("Purple Lemonade", tier=2, family="Fruit / citrus",
      lineage="Lemon × purple line — confirm",
      aroma="Lemon-citrus.",
      look="Heavy purple expression.",
      flag="Confirm photoperiod, not auto",
      notes="The best-known Purple Lemonade release is an autoflower. We need a photoperiod indoor cut.",
      needs="Photoperiod or autoflower?"),
    s("Galactic Warheadz", tier=2, family="Candy / Z",
      lineage="Warheadz family — confirm the cross",
      aroma="Sour candy — typically bright, citrus-sour with a gas backbone.",
      position="Candy lane — recommended build",
      needs="Full cross and breeder."),
]


# ---- Tier 3: need the cultivator before anything is printed ----
def t3(name, family, note, needs="Full cross and breeder.", **kw):
    return s(name, tier=3, family=family, flag="Tier 3 — needs cultivator",
             notes=note, needs=needs, **kw)


T3 = [
    t3("MG_26", "Unknown", "Numbered in-house selection. No public documentation."),
    t3("Ze Chem", "Gas / funk",
       "Name implies a Z × Chem cross. Chem-family funk over candy sweetness would be the expectation, but that is an inference from the name, not a source.",
       needs="Full cross — name suggests a Z × Chem line."),
    t3("Super Buff Cherry", "Candy / Z",
       "Cherry-forward by name. The \"Super Buff\" prefix suggests a specific breeder line."),
    t3("Blue Taffeze", "Candy / Z", "Blue taffy and Z-family by the name. No public documentation."),
    t3("Lemon Slice", "Fruit / citrus",
       "Citrus-forward by name. If it is genuinely lemon-dominant it is one of the few non-dessert, non-gas options on the sheet and worth keeping for that alone.",
       position="Fruit / citrus lane — recommended build"),
    t3("Ron Burgundy", "Unknown", "Boutique name with no reliable public documentation."),
    t3("Kermit", "Unknown", "In-house or boutique name. No reliable public documentation."),
    t3("G10", "Unknown", "Numbered selection. No public documentation."),
    t3("Nimbus Snacks", "Dessert", "In-house or boutique name. No reliable public documentation."),
    t3("Global OG", "Gas / funk",
       "OG family by name. If it is a true OG expression it fills a lane nothing else here covers — classic OG structure and pine-fuel is a distinct ask from customers who don't want dessert or candy.",
       needs="Full cross — is this a true OG expression?",
       position="Gas lane — recommended build if confirmed"),
    t3("Black Maple Zuava", "Candy / Z",
       "Guava family by the name (Zuava reads as Z × Guava). \"Maple\" suggests a sweeter, darker profile."),
    t3("Itz Pluto", "Dessert", "In-house or boutique name. No reliable public documentation."),
]

strains = T1 + T2 + T3
assert len(strains) == 30, len(strains)
ids = [x["id"] for x in strains]
assert len(set(ids)) == 30, [i for i in ids if ids.count(i) > 1]

doc = json.load(open(OUT, encoding="utf-8"))
doc["strains"] = strains
json.dump(doc, open(OUT, "w", encoding="utf-8"), indent=1, ensure_ascii=False)

by_tier = {}
for x in strains:
    by_tier[x["tier"]] = by_tier.get(x["tier"], 0) + 1
print("wrote %d strains -> %s" % (len(strains), OUT))
print("  tiers:", ", ".join("T%d: %d" % (k, by_tier[k]) for k in sorted(by_tier)))
print("  categorised:", ", ".join(sorted(set(x["type"] for x in strains))))
print("  no terpene data (left blank on purpose):",
      sum(1 for x in strains if not x["terpenes"]))

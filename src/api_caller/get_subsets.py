import csv
from pathlib import Path
from  get_expansion_functions import make_csv

# get the list of expansions...
misc = [
    { 'set': 'Legendary Treasures', 'subset': 'Radiant Collection'},
    { 'set': 'Generations', 'subset': 'Radiant Collection'},
    { 'set': 'Brilliant Stars', 'subset': 'Trainer Gallery'},
    { 'set': 'Astral Radiance', 'subset': 'Trainer Gallery'},
    { 'set': 'Lost Origin', 'subset': 'Trainer Gallery'},
    { 'set': 'Silver Tempest', 'subset': 'Trainer Gallery'},
    { 'set': 'Celebrations', 'subset': 'Classic Collection'},
]
for set in misc:

    # skip expansions is a .csv already exists
    if Path(f"expansions/{set['set']}-{set['subset']}.csv").exists():
        print(f"Skipping {set['set']}-{set['subset']}")
        continue

    # fetch expansion
    print(f"Start parsing {set['set']} ...", end = '')
    make_csv(set['set'], 'expansions', set['subset'])

# announce complete
print('Finished fetching expansions.')
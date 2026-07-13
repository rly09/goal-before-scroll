import csv
import json
import os
import re

def main():
    csv_path = 'labels.csv'
    output_dir = 'data'
    output_path = os.path.join(output_dir, 'memes.json')

    # Categories definition with keyword triggers (lowercase)
    category_triggers = {
        'Dogs': r'\b(dog|dogs|puppy|puppies|bark|pup|canine|doggo)\b',
        'Cats': r'\b(cat|cats|kitten|kittens|meow|feline|purr|cattos)\b',
        'Anime': r'\b(anime|manga|naruto|goku|vegeta|sasuke|dragon\s*ball|pokemon|pikachu|shinobi|otaku|hentai|gohan|luffy)\b',
        'Parents': r'\b(mom|dad|mother|father|parents|parent|mommy|daddy|grandpa|grandma|son|daughter)\b',
        'Sigma': r'\b(sigma|chad|alpha|grindset|gigachad|hustle|grind|bale|patrick\s*bateman)\b',
        'Facepalm': r'\b(facepalm|face\s*palm|idiot|stupid|dumb|fool|clown|face-palm|dumbass)\b',
        'Roast': r'\b(roast|roasted|burn|burned|destroyed|wrecked|trash|loser|sucks|ugly|fail|failure)\b',
        'Reaction': r'\b(reaction|when\s*you|me\s*when|mfw|tfw|me\s*realising|nobody:|realising|realize|that\s*face|that\s*moment)\b'
    }

    # Initialize categorized lists
    categories = {cat: [] for cat in category_triggers.keys()}
    categories['Random'] = []  # To hold all memes

    print(f"Reading {csv_path}...")
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found! Run the script in the extension root directory.")
        return

    os.makedirs(output_dir, exist_ok=True)

    count = 0
    with open(csv_path, mode='r', encoding='utf-8', errors='ignore') as f:
        # Use csv.reader because labels.csv might have irregular headers or index columns
        reader = csv.reader(f)
        header = next(reader, None)  # Skip header
        
        for row in reader:
            if not row or len(row) < 3:
                continue
            
            # The columns are: index (0), image_name (1), text_ocr (2), text_corrected (3), overall_sentiment (4)
            image_name = row[1].strip()
            text_ocr = row[2].strip()
            text_corrected = row[3].strip() if len(row) > 3 else ""

            if not image_name:
                continue

            text_to_search = (text_ocr + " " + text_corrected).lower()

            # Always add to Random
            categories['Random'].append(image_name)
            
            # Categorize based on keywords
            matched_category = False
            for cat, trigger_regex in category_triggers.items():
                if re.search(trigger_regex, text_to_search):
                    categories[cat].append(image_name)
                    matched_category = True
            
            count += 1

    print(f"Processed {count} memes.")
    
    # Print stats
    for cat, list_memes in categories.items():
        print(f"  Category '{cat}': {len(list_memes)} memes")

    with open(output_path, 'w', encoding='utf-8') as out_f:
        json.dump(categories, out_f, indent=2)
    print(f"Saved categorized memes list to {output_path}")

if __name__ == '__main__':
    main()

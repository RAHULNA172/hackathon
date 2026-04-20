import csv
import os

def process_database(input_file):
    print(f"Reading from {input_file}...")
    
    high_priority = []
    medium_priority = []
    low_priority = []
    
    header = []
    
    # Read the data
    with open(input_file, mode='r', newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        
        for row in reader:
            if not row:
                continue
            # The last column is priority_label
            label = row[-1].strip()
            if label == 'High':
                high_priority.append(row)
            elif label == 'Medium':
                medium_priority.append(row)
            elif label == 'Low':
                low_priority.append(row)
            elif label == '':
                # Handle cases where priority label might be missing but score is high/low (edge cases observed in data)
                try:
                    score = float(row[-2])
                    if score >= 6.0:
                        high_priority.append(row)
                    elif score <= 2.0:
                        low_priority.append(row)
                    else:
                        medium_priority.append(row)
                except ValueError:
                    pass

    print(f"Found {len(high_priority)} High priority tasks.")
    print(f"Found {len(medium_priority)} Medium priority tasks.")
    print(f"Found {len(low_priority)} Low priority tasks.")
    
    # Write to separate files
    def write_csv(filename, data):
        with open(filename, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(header)
            writer.writerows(data)
        print(f"Saved {filename}")

    write_csv('high_priority.csv', high_priority)
    write_csv('medium_priority.csv', medium_priority)
    write_csv('low_priority.csv', low_priority)
    
    print("Processing complete!")

if __name__ == "__main__":
    db_file = "data.csv"
    if os.path.exists(db_file):
        process_database(db_file)
    else:
        print(f"Error: {db_file} not found.")

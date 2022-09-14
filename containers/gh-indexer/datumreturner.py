# Modify this file the day you want more than 2007-2021 data

import datetime
import json

def return_day_split(starstart, starend):
    dates = []
    for i in range(2007, 2022):
        for j in range(1, 13):
            for k in range(1, 32):
                try:
                    dates.append(datetime.datetime(i, j, k))
                except ValueError:
                    pass
    return dates

def scrape_range_days():
    ranges = [
        (0, 1), (2, 3), (4, 5), (6, 7), (8, 9), (10, 11), (12, 13), (14, 15), 
        (16, 20), (21, 25), (26, 30), (31, 35), (36, 40), (41, 45), (46, 50),
        (51, 60), (61, 70), (71, 80), (81, 90), (91, 100),
        (100, 119), (120, 139), (140, 159), (160, 179), (180, 200),
        (201, 225), (226, 250), (251, 300), (301, 400), (401, 500),
        (501, 700), (701, 1000), (1001, 1500), (1501, 5000), (5001, 1_000_000),
        (1001, 1500), (1501, 5000), (5001, 1_000_000), (1_000_000, 10_000_000)
    ]

    datestarrange = []
    for a, b in ranges:
        stars = f'{a}..{b}'
        for i in return_day_split(a, b):
            datestarrange.append([stars, i])
    return datestarrange

def default(o):
    if isinstance(o, (datetime.date, datetime.datetime)):
        return o.isoformat()

job_id = 0
for i in scrape_range_days():
    st, dt = i
    datum = {}
    datum['starRange'] = st
    datum['date'] = dt
    f = open("datums/" + "{:09d}".format(job_id), "w")
    f.write(json.dumps(datum, indent=4, default=default))
    f.close()
    print(str(job_id))
    job_id += 1
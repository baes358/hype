from pytrends.request import TrendReq
import time

pytrends = TrendReq(hl='en-US', tz=360)

# Test with 5 teams from your CSV
test_teams = [
    "Michigan basketball",
    "Duke basketball",
    "UConn basketball",
    "Florida basketball",
    "Houston basketball"
]

pytrends.build_payload(
    test_teams,
    cat=0,
    timeframe='2026-03-03 2026-03-17',
    geo='US'
)

interest = pytrends.interest_over_time()
print(interest)
print()
print("Mean interest by team:")
print(interest.drop(columns=['isPartial'], errors='ignore').mean().sort_values(ascending=False))
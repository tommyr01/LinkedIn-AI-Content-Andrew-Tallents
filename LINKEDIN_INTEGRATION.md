# LinkedIn Profile Integration

This application integrates with the LinkedIn Scraper API via RapidAPI to automatically populate connection records with rich profile data.

## Setup

1. **Get RapidAPI Key**
   - Sign up for RapidAPI at https://rapidapi.com
   - Subscribe to the "LinkedIn Scraper API - Real Time Fast Affordable" API
   - Copy your API key

2. **Environment Variables**
   - Add `RAPIDAPI_KEY=your_rapidapi_key` to your `.env.local` file
   - The key should be from RapidAPI for the LinkedIn scraper service

## How It Works

### Auto-fill Connection Data
1. Click "Add Connection" in the connections page
2. Enter a LinkedIn username (e.g., "andrewtallents") 
3. Click "Fetch Data" to retrieve profile information
4. Review the enriched data preview
5. Save to create a fully populated Airtable record

### Data Mapping
The LinkedIn API response automatically populates these Airtable fields:

**Basic Information:**
- Full Name, First Name, Last Name
- Headline, About section
- LinkedIn Username

**Professional Details:**
- Current Company, Job Title
- Start Date, Duration at company
- Company LinkedIn URL

**Profile Data:**
- Location, Profile Picture
- Follower Count, Connection Count
- Creator/Influencer/Premium status
- Creator hashtags

**Social Metrics:**
- Follower count with proper formatting (1.2K, 5.4M)
- Connection count
- Engagement scoring

## API Endpoints

### `/api/connections/enrich-from-linkedin`

**POST** - Create enriched connection record
```json
{
  "username": "andrewtallents",
  "createRecord": true
}
```

**GET** - Preview profile data (testing)
```
/api/connections/enrich-from-linkedin?username=andrewtallents
```

## Error Handling

- **404**: LinkedIn profile not found
- **429**: Rate limit exceeded
- **500**: API configuration error
- Graceful fallback to manual entry if enrichment fails

## Usage Tips

- Use just the username part (not full URL)
- Examples: "andrewtallents", "johndoe", "jane-smith"
- Public profiles work best
- Rate limits apply - don't exceed API quotas

This integration transforms basic contact entry into comprehensive LinkedIn profile import, dramatically reducing manual data entry while ensuring data accuracy and completeness.
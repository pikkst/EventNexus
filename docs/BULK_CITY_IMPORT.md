# Bulk City Import by Country

## Overview
The Bulk City Import feature allows administrators to quickly add multiple major cities from a country at once, significantly speeding up the platform expansion process. Instead of adding cities one by one, you can import 15-20 major cities from a country with just a few clicks.

## How It Works

### 1. **AI-Powered City Discovery**
When you select a country, the system uses Gemini AI to:
- Find the top 20 major cities in that country
- Retrieve accurate GPS coordinates (latitude/longitude)
- Determine the correct IANA timezone for each city
- Use English city names for consistency

### 2. **Smart Duplicate Detection**
Before importing:
- System checks which cities already exist in the database
- Existing cities are marked and cannot be selected
- Only new cities are available for import

### 3. **Selective Import**
- Review the AI-suggested cities
- Select/deselect individual cities
- Bulk select all new cities
- Import only the cities you want

### 4. **Automatic Bootstrap**
After import, each city automatically:
- Gets added to the database with coordinates and timezone
- Enters the bootstrap queue for event source discovery
- Starts the AI agent pipeline within 5 minutes
- Begins collecting events

## Usage Guide

### Access the Feature
1. Navigate to `/admin/ai-agents`
2. Go to the **Manage Cities** tab
3. Click the **Add Country** button (green button with globe icon)

### Import Cities

#### Step 1: Select Country
```
1. Enter a country name (e.g., "Germany", "France", "United States", "Japan")
2. Click "Find Cities" or press Enter
3. Wait for AI to fetch major cities (~5-10 seconds)
```

#### Step 2: Review Suggested Cities
The system will display:
- **City name** (in English)
- **Coordinates** (latitude, longitude)
- **Timezone** (IANA format)
- **Status** (Already exists / New)

Example for Germany:
```
✅ Berlin         52.5200, 13.4050    Europe/Berlin
✅ Munich         48.1351, 11.5820    Europe/Berlin
✅ Hamburg        53.5511, 9.9937     Europe/Berlin
⚪ Frankfurt     50.1109, 8.6821     Europe/Berlin
⚪ Cologne       50.9375, 6.9603     Europe/Berlin
...
```

#### Step 3: Select Cities
- **Select All New**: Selects all cities not yet in database
- **Deselect All**: Clears all selections
- **Manual selection**: Click checkboxes to select individual cities

#### Step 4: Import
1. Click **Import X Cities** button
2. Confirm the import in the dialog
3. Wait for bulk import to complete
4. Review the success/failure summary

### Import Progress
During import, you'll see:
```
Importing Cities... 5/15
Current: Munich, Germany
[████████░░░░░░░] 33%
```

### Results Summary
After completion:
```
🌍 Bulk Import Complete!

✅ Successfully imported: 14
❌ Failed: 1

Successful cities:
✓ Berlin, Germany
✓ Munich, Germany
✓ Hamburg, Germany
...

Failed cities:
✗ Stuttgart, Germany: Duplicate entry

🤖 Auto-bootstrap will start within 5 minutes.
Check Agent Logs to monitor progress.
```

## Examples

### Import German Cities
```
Country: Germany
→ Finds: Berlin, Munich, Hamburg, Frankfurt, Cologne, Stuttgart, etc.
→ Result: ~15-20 major German cities added
```

### Import US Cities
```
Country: United States
→ Finds: New York, Los Angeles, Chicago, Houston, Phoenix, etc.
→ Result: ~20 major US cities added
```

### Import Japanese Cities
```
Country: Japan
→ Finds: Tokyo, Osaka, Kyoto, Yokohama, Nagoya, etc.
→ Result: ~15-20 major Japanese cities added
```

## Technical Details

### AI Model Used
- **Model**: Gemini 2.0 Flash Exp
- **Temperature**: 0.3 (for consistency)
- **Max Tokens**: 4096
- **Response Format**: JSON array

### Data Structure
Each city returned by AI:
```json
{
  "city_name": "Berlin",
  "country": "Germany",
  "latitude": 52.52,
  "longitude": 13.405,
  "timezone": "Europe/Berlin"
}
```

### Import Process
1. **Fetch cities from Gemini AI** (5-10 seconds)
2. **Validate response** (check JSON format)
3. **Check for duplicates** (query database)
4. **Present selection UI** (admin reviews)
5. **Bulk import** (500ms delay between cities)
6. **Auto-bootstrap** (trigger for each city)

### Error Handling
- Invalid JSON responses from AI → Retry with user notification
- Duplicate cities → Marked and skipped
- Failed imports → Logged and reported in summary
- Database errors → Graceful failure with error message

## Benefits

### Speed
- **Before**: Adding 20 cities = ~30-40 minutes (manual, one by one)
- **After**: Adding 20 cities = ~2-3 minutes (bulk import)
- **Improvement**: ~90% time savings

### Accuracy
- AI provides accurate coordinates and timezones
- Reduces manual data entry errors
- Consistent English city names

### Scalability
- Easy to expand to new countries
- Quick platform growth
- Efficient admin workflow

## Use Cases

### 1. Country Expansion
**Scenario**: Launch EventNexus in Germany
```
Action: Bulk import all major German cities
Result: 15-20 cities ready for event discovery
Time: 3 minutes vs 40 minutes manual
```

### 2. Regional Coverage
**Scenario**: Cover Scandinavia
```
Action: Import cities from Sweden, Norway, Denmark, Finland
Result: 60-80 cities across 4 countries
Time: 15 minutes vs 4+ hours manual
```

### 3. Rapid Testing
**Scenario**: Test AI agents in diverse locations
```
Action: Import cities from 5 different countries
Result: 100 cities for testing
Time: 20 minutes
```

## Limitations

### AI Limitations
- May not include very small cities
- Focuses on major urban centers
- ~20 cities per request (to avoid token limits)

### Technical Limitations
- Requires Gemini API key
- Rate limited to avoid API throttling (500ms between imports)
- Internet connection required

### Recommended Workflow
1. **Use bulk import for major cities** (capitals, large metros)
2. **Use single city add for specific smaller cities**
3. **Review AI suggestions** before importing
4. **Monitor bootstrap progress** after import

## Monitoring & Verification

### After Import
1. Go to **Cities** tab to verify imported cities
2. Check **Bootstrap Status** (should be "pending" or "discovering_sources")
3. Monitor **Agent Logs** tab for bootstrap progress
4. Wait 5-30 minutes for initial event sources to be discovered

### Health Check
After 1-2 hours:
- Check city health scores
- Verify event sources were discovered
- Review parsed events count
- Check for any failed bootstraps

## Troubleshooting

### "No cities found in AI response"
- **Cause**: Invalid country name or AI error
- **Solution**: Try a different country name variant (e.g., "USA" → "United States")

### "Failed to parse Gemini response"
- **Cause**: AI returned invalid JSON
- **Solution**: Retry the request (AI is sometimes inconsistent)

### "City already exists"
- **Cause**: City is already in database
- **Solution**: This is expected behavior, skip or deselect the city

### Bulk import partially failed
- **Cause**: Database constraint violations or network errors
- **Solution**: Check the failure summary, retry failed cities individually

## Best Practices

### 1. Start with Major Markets
```
Priority 1: Major European capitals
Priority 2: Large US cities
Priority 3: Asian metropolitan areas
Priority 4: Other regions
```

### 2. Review Before Importing
- Always review AI suggestions
- Deselect cities you don't want to cover
- Verify coordinates look reasonable

### 3. Monitor Bootstrap
- Don't import too many countries at once
- Give bootstrap time to complete (5-30 min per city)
- Check Agent Logs for errors

### 4. Batch Wisely
- Import 1-2 countries at a time
- Wait for bootstrap to complete before next batch
- Monitor system resources

## Future Enhancements

### Planned Features
- [ ] Continent-level bulk import
- [ ] Custom city count (10, 20, 50, 100)
- [ ] Population filters (>500k, >1M, etc.)
- [ ] Import from CSV file
- [ ] Duplicate merge assistant

### Possible Improvements
- Parallel import (faster processing)
- Auto-retry failed imports
- City preview on map
- Historical event data backfill

## Related Documentation
- [City Management Guide](./ADMIN_IMPLEMENTATION.md)
- [AI Agent System](./AI_AGENT_IMPROVEMENTS_DEPLOYMENT.md)
- [Bootstrap Process](./AUTONOMOUS_OPERATIONS_FULL.md)
- [Country Code System](./AUTO_COUNTRY_CODE_SYSTEM.md)

## Support
For issues or questions:
- Check Agent Logs for detailed error messages
- Review city health metrics
- Contact: huntersest@gmail.com

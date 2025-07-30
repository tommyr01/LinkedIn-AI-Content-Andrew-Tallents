// LinkedIn scraper service using RapidAPI
export interface LinkedInProfile {
  success: boolean;
  message: string;
  data: {
    basic_info: {
      fullname: string;
      first_name: string;
      last_name: string;
      headline: string;
      public_identifier: string;
      profile_picture_url: string;
      about: string;
      location: {
        country: string;
        city: string;
        full: string;
        country_code: string;
      };
      creator_hashtags: string[];
      is_creator: boolean;
      is_influencer: boolean;
      is_premium: boolean;
      show_follower_count: boolean;
      background_picture_url: string;
      urn: string;
      follower_count: number;
      connection_count: number;
      current_company: string;
      current_company_urn: string;
      current_company_url: string;
    };
    experience: Array<{
      title: string;
      company: string;
      location: string;
      description: string;
      duration: string;
      start_date: {
        year: number;
        month: string;
      };
      is_current: boolean;
      company_linkedin_url: string;
      company_id: string;
    }>;
    education: Array<{
      school: string;
      degree: string;
      field_of_study: string;
      duration: string;
      start_date: { year: number; month?: string };
      end_date: { year: number; month?: string };
    }>;
    certifications: Array<{
      name: string;
      issuer: string;
      issued_date: string;
    }>;
  };
}

export interface MappedConnectionData {
  'Full Name': string;
  'First Name': string;
  'Last Name': string;
  'Headline': string;
  'Username': string;
  'About': string;
  'Full Location': string;
  'Hashtags': string;
  'Is Creator': boolean;
  'Is Influencer': boolean;
  'Is Premium': boolean;
  'Show Follower Count': boolean;
  'Background Picture URL': string;
  'URN': string;
  'Follower Count': number;
  'Connection Count': number;
  'Current Company': string;
  'Title': string;
  'Start Date': string;
  'Is Current': boolean;
  'Company LinkedIn URL': string;
  'Current Company URN': string;
  // Note: Profile Picture URL will be handled separately as attachment
}

export class LinkedInScraperService {
  private apiKey: string;
  private baseUrl = 'https://linkedin-scraper-api-real-time-fast-affordable.p.rapidapi.com';

  constructor() {
    this.apiKey = process.env.RAPIDAPI_KEY!;
    if (!this.apiKey) {
      throw new Error('Missing RAPIDAPI_KEY environment variable');
    }
  }

  private getHeaders() {
    return {
      'x-rapidapi-host': 'linkedin-scraper-api-real-time-fast-affordable.p.rapidapi.com',
      'x-rapidapi-key': this.apiKey,
    };
  }

  async getProfile(username: string): Promise<LinkedInProfile> {
    try {
      const url = `${this.baseUrl}/profile/detail?username=${encodeURIComponent(username)}`;
      
      console.log(`Fetching LinkedIn profile for username: ${username}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('LinkedIn API error:', response.status, errorText);
        throw new Error(`LinkedIn API error: ${response.status} ${errorText}`);
      }

      const data: LinkedInProfile = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch LinkedIn profile');
      }

      return data;
    } catch (error) {
      console.error('Error fetching LinkedIn profile:', error);
      throw error;
    }
  }

  mapToAirtableFields(profile: LinkedInProfile): MappedConnectionData {
    const { basic_info, experience } = profile.data;
    
    // Find current job from experience
    const currentJob = experience.find(exp => exp.is_current) || experience[0];
    
    // Format start date for current job
    let startDate = '';
    if (currentJob?.start_date) {
      const year = currentJob.start_date.year;
      const month = currentJob.start_date.month;
      // Convert month name to number and create ISO date
      const monthNumber = this.getMonthNumber(month);
      startDate = `${year}-${monthNumber.toString().padStart(2, '0')}-01`;
    }

    return {
      'Full Name': basic_info.fullname || '',
      'First Name': basic_info.first_name || '',
      'Last Name': basic_info.last_name || '',
      'Headline': basic_info.headline || '',
      'Username': basic_info.public_identifier || '',
      'About': basic_info.about || '',
      'Full Location': basic_info.location?.full || '',
      'Hashtags': basic_info.creator_hashtags?.join(', ') || '',
      'Is Creator': basic_info.is_creator || false,
      'Is Influencer': basic_info.is_influencer || false,
      'Is Premium': basic_info.is_premium || false,
      'Show Follower Count': basic_info.show_follower_count || false,
      'Background Picture URL': basic_info.background_picture_url || '',
      'URN': basic_info.urn || '',
      'Follower Count': basic_info.follower_count || 0,
      'Connection Count': basic_info.connection_count || 0,
      'Current Company': basic_info.current_company || currentJob?.company || '',
      'Title': currentJob?.title || '',
      'Start Date': startDate,
      'Is Current': currentJob?.is_current || false,
      'Company LinkedIn URL': basic_info.current_company_url || currentJob?.company_linkedin_url || '',
      'Current Company URN': basic_info.current_company_urn || '',
    };
  }

  private getMonthNumber(monthName: string): number {
    const months: { [key: string]: number } = {
      'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
      'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
    };
    return months[monthName] || 1;
  }

  async getProfilePictureAsAttachment(profilePictureUrl: string): Promise<any> {
    if (!profilePictureUrl) return null;

    try {
      // For now, we'll return the URL directly
      // Airtable attachments typically need to be uploaded separately
      // This could be enhanced to download and upload the image
      return {
        url: profilePictureUrl,
        filename: 'profile-picture.jpg'
      };
    } catch (error) {
      console.error('Error processing profile picture:', error);
      return null;
    }
  }
}

// Helper function to extract username from LinkedIn URL
export function extractUsernameFromLinkedInUrl(url: string): string {
  const match = url.match(/linkedin\.com\/in\/([^/]+)/i);
  return match ? match[1] : url;
}

// Main service instance
export const linkedInScraper = new LinkedInScraperService();
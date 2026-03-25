const { google } = require('googleapis');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// Returns all GMB accounts + locations for the authenticated user
async function getLocations(accessToken) {
  console.log('📍 GMB: fetching accounts...');

  const accountsRes = await axios.get(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const accounts = accountsRes.data.accounts || [];
  console.log(`📍 GMB: found ${accounts.length} account(s)`);

  const allLocations = [];

  for (const account of accounts) {
    try {
      const locRes = await axios.get(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,storefrontAddress`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const locations = locRes.data.locations || [];
      locations.forEach((loc) => {
        allLocations.push({
          name: loc.name,
          title: loc.title,
          address: loc.storefrontAddress,
          accountName: account.name,
        });
      });
    } catch (err) {
      console.error(`⚠️ GMB: could not fetch locations for ${account.name}:`, err.message);
    }
  }

  console.log(`📍 GMB: found ${allLocations.length} location(s) total`);
  return allLocations;
}

// Returns all reviews for a given location
// locationId format: "accounts/{accountId}/locations/{locationId}"
async function getReviews(accessToken, locationId) {
  console.log(`📋 GMB: fetching reviews for ${locationId}...`);

  const response = await axios.get(
    `https://mybusiness.googleapis.com/v4/${locationId}/reviews`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const reviews = response.data.reviews || [];
  console.log(`📋 GMB: found ${reviews.length} review(s)`);
  return reviews;
}

// Posts a reply to a specific review
// locationId: "accounts/{accountId}/locations/{locationId}"
// reviewId: the review name or ID string
async function postReply(accessToken, locationId, reviewId, replyText) {
  console.log(`💬 GMB: posting reply to review ${reviewId}...`);

  const response = await axios.put(
    `https://mybusiness.googleapis.com/v4/${locationId}/reviews/${reviewId}/reply`,
    { comment: replyText },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  console.log('✅ GMB: reply posted successfully');
  return response.data;
}

// Refreshes an expired access token using the stored refresh token
// Also updates the tenant record in DB with the new token
async function refreshAccessToken(tenantId, refreshToken) {
  console.log(`🔄 GMB: refreshing access token for tenant ${tenantId}...`);

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  const newAccessToken = credentials.access_token;
  const tokenExpiry = new Date(credentials.expiry_date);

  // Save updated token to DB
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      accessToken: newAccessToken,
      tokenExpiry,
    },
  });

  console.log('✅ GMB: access token refreshed and saved to DB');
  return { accessToken: newAccessToken, tokenExpiry };
}

// Helper: returns a valid access token, refreshing if needed
async function getValidAccessToken(tenant) {
  const now = new Date();
  const expiryBuffer = 5 * 60 * 1000; // refresh 5 minutes before expiry

  if (tenant.tokenExpiry && new Date(tenant.tokenExpiry) - now < expiryBuffer) {
    console.log('🔄 GMB: token expired or expiring soon — refreshing...');
    const refreshed = await refreshAccessToken(tenant.id, tenant.refreshToken);
    return refreshed.accessToken;
  }

  return tenant.accessToken;
}

module.exports = {
  getOAuthClient,
  getLocations,
  getReviews,
  postReply,
  refreshAccessToken,
  getValidAccessToken,
};

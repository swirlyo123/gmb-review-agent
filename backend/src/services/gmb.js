// Google My Business API service
// Phase 2: Full OAuth + GMB API integration
// This file will handle fetching reviews from the GMB API

async function getLocationReviews(accessToken, accountId, locationId) {
  // TODO Phase 2: Implement GMB API call
  // GET https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews
  console.log('📍 GMB API: getLocationReviews called (stub — wire in Phase 2)');
  return [];
}

async function postReply(accessToken, accountId, locationId, reviewId, replyText) {
  // TODO Phase 2: Implement GMB reply posting
  // PUT https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews/{reviewId}/reply
  console.log('📍 GMB API: postReply called (stub — wire in Phase 2)');
  return { success: true };
}

module.exports = { getLocationReviews, postReply };

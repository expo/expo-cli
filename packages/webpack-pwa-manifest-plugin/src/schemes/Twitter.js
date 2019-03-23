// twitter
export default {
  twitter: {
    // og:type
    // The card type
    /**
     * summary, summary_large_image, app, player
     */
    card: '',
    // @username of website. Either twitter:site or twitter:site:id is required.
    // Used with summary, summary_large_image, app, player cards
    site: {
      default: '',
      // Same as twitter:site, but the user’s Twitter ID. Either twitter:site or twitter:site:id is required.
      // Used with summary, summary_large_image, player cards
      id: '',
    },
    // Title of content (max 70 characters) - fallback to og:title
    title: '',
    // Description of content (maximum 200 characters) - fallback to og:description
    description: '',
    // summary_large_image cards
    creator: {
      // @username of content creator
      // Used with summary_large_image cards
      default: '',
      // Twitter user ID of content creator
      // Used with summary, summary_large_image cards
      id: '',
    },
    // must be less than 5MB. Only the first frame of an animated GIF will be used. SVG is not supported - fallback to og:image
    // summary, summary_large_image, player cards
    image: {
      default: '',
      alt: '',
    },
    // player card
    player: {
      // HTTPS URL of player iframe
      // Used with player card
      default: '',
      // Width of iframe in pixels
      // Used with player card
      width: 0,
      // Height of iframe in pixels
      // Used with player card
      height: 0,
      // URL to raw video or audio stream
      // Used with player card
      stream: '',
    },
    // app card
    app: {
      name: {
        iphone: '',
        // Name of your iPad optimized app
        ipad: '',
        googleplay: '',
      },
      id: {
        // Your app ID in the iTunes App Store (Note: NOT your bundle ID)
        iphone: '',
        //
        ipad: '',
        // Your app ID in the Google Play Store
        googleplay: '',
      },
      // Your app’s custom URL scheme (you must include ”://” after your scheme name)
      url: {
        iphone: '',
        ipad: '',
        googleplay: '',
      },
    },
  },
};

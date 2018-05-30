const urlLib = require('url');
const { sortBy, has } = require('lodash');

const { BUNGIE_API_KEY } = process.env;

const componentProfiles = 100; // eslint-disable-line
const componentVendorReceipts = 101; // eslint-disable-line
const componentProfileInventories = 102; // eslint-disable-line
const componentProfileCurrencies = 103; // eslint-disable-line
const componentCharacters = 200; // eslint-disable-line
const componentCharacterInventories = 201; // eslint-disable-line
const componentCharacterProgressions = 202; // eslint-disable-line
const componentCharacterRenderData = 203; // eslint-disable-line
const componentCharacterActivities = 204; // eslint-disable-line
const componentCharacterEquipment = 205; // eslint-disable-line
const componentItemInstances = 300; // eslint-disable-line
const componentItemObjectives = 301; // eslint-disable-line
const componentItemPerks = 302; // eslint-disable-line
const componentItemRenderData = 303; // eslint-disable-line
const componentItemStats = 304; // eslint-disable-line
const componentItemSockets = 305; // eslint-disable-line
const componentItemTalentGrids = 306; // eslint-disable-line
const componentItemCommonData = 307; // eslint-disable-line
const componentItemPlugStates = 308; // eslint-disable-line
const componentVendors = 400; // eslint-disable-line
const componentVendorCategories = 401; // eslint-disable-line
const componentVendorSales = 402; // eslint-disable-line
const componentKiosks = 500; // eslint-disable-line

const PROFILE_COMPONENTS = [
  componentProfiles,
  componentProfileInventories,
  componentCharacters,
  componentCharacterInventories,
  componentCharacterEquipment,
  componentItemSockets,
  componentKiosks
].join(', ');

let DEBUG_STORE = {
  profiles: []
};

function get(url, opts) {
  return fetch(url, opts).then(res => res.json());
}

function getEnsuredAccessTokenNoop() {
  return Promise.resolve(null);
}

function getDestiny(_pathname, opts = {}, postBody) {
  const url = `https://www.bungie.net${_pathname}`;
  const { pathname } = urlLib.parse(url);

  opts.headers = opts.headers || {};
  opts.headers['x-api-key'] = BUNGIE_API_KEY;

  if (opts.accessToken) {
    opts.headers['Authorization'] = `Bearer ${opts.accessToken}`;
  }

  if (postBody) {
    opts.method = 'POST';
    if (typeof postBody === 'string') {
      opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      opts.body = postBody;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(postBody);
    }
  }

  return get(url, opts).then(resp => {
    if (resp.ErrorStatus === 'DestinyAccountNotFound') {
      return null;
    }

    if (has(resp, 'ErrorCode') && resp.ErrorCode !== 1) {
      const cleanedUrl = url.replace(/\/\d+\//g, '/_/');
      const err = new Error(
        'Bungie API Error ' +
          resp.ErrorStatus +
          ' - ' +
          resp.Message +
          '\nURL: ' +
          cleanedUrl
      );

      err.data = resp;

      throw err;
    }

    return resp.Response || resp;
  });
}

function getProfile(accessToken, { membershipType, membershipId }) {
  const url = `/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=${PROFILE_COMPONENTS}`;
  return getDestiny(url, { accessToken });
}

function getAllProfilesForUser(accessToken) {
  let bungieNetUser;

  return getDestiny('/Platform/User/GetMembershipsForCurrentUser/', {
    accessToken
  })
    .then(body => {
      bungieNetUser = body.bungieNetUser;
      DEBUG_STORE.membershipsForCurrentUser = body;

      return Promise.all(
        body.destinyMemberships.map(mship => getProfile(accessToken, mship))
      );
    })
    .then(profiles => {
      const sortedProfiles = sortBy(
        profiles
          .filter(Boolean)
          .filter(profile => profile.profile.data.versionsOwned !== 0),
        profile => {
          return new Date(profile.profile.data.dateLastPlayed).getTime();
        }
      ).reverse();

      const payload = {
        profiles: sortedProfiles,
        bungieNetUser
      };

      return payload;
    });
}

module.exports = { getAllProfilesForUser };

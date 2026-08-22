/**
 * Curated royalty-free music library for reel posting (Mixkit music,
 * free-license, hotlinked like the channel-seed videos). Music on a reel
 * REPLACES the video's original audio at playback — TikTok semantics.
 * ids are stable — stored on Reel rows; never reuse/renumber.
 */
export interface MusicTrack { id: string; title: string; genre: string; url: string; }

export const MUSIC_TRACKS: MusicTrack[] = [
  { id: 'mk-738', title: 'Hip Hop 02', genre: 'Hip-Hop', url: 'https://assets.mixkit.co/music/738/738.mp3' },
  { id: 'mk-400', title: 'C.B.P.D', genre: 'Hip-Hop', url: 'https://assets.mixkit.co/music/400/400.mp3' },
  { id: 'mk-262', title: 'Praise the Lord', genre: 'Hip-Hop', url: 'https://assets.mixkit.co/music/262/262.mp3' },
  { id: 'mk-281', title: 'Complicated', genre: 'Hip-Hop', url: 'https://assets.mixkit.co/music/281/281.mp3' },
  { id: 'mk-282', title: 'Sweet September', genre: 'Hip-Hop', url: 'https://assets.mixkit.co/music/282/282.mp3' },
  { id: 'mk-403', title: 'G Eazy NBA type', genre: 'Hip-Hop', url: 'https://assets.mixkit.co/music/403/403.mp3' },
  { id: 'mk-267', title: 'Trap Hamza', genre: 'Hip-Hop', url: 'https://assets.mixkit.co/music/267/267.mp3' },
  { id: 'mk-369', title: 'Need for speed', genre: 'Hip-Hop', url: 'https://assets.mixkit.co/music/369/369.mp3' },
  { id: 'mk-127', title: 'Valley Sunset', genre: 'Chill', url: 'https://assets.mixkit.co/music/127/127.mp3' },
  { id: 'mk-292', title: 'Relax Beat', genre: 'Chill', url: 'https://assets.mixkit.co/music/292/292.mp3' },
  { id: 'mk-139', title: 'Spirit in the Woods', genre: 'Chill', url: 'https://assets.mixkit.co/music/139/139.mp3' },
  { id: 'mk-138', title: 'Forest Treasure', genre: 'Chill', url: 'https://assets.mixkit.co/music/138/138.mp3' },
  { id: 'mk-749', title: 'Relaxation 05', genre: 'Chill', url: 'https://assets.mixkit.co/music/749/749.mp3' },
  { id: 'mk-184', title: 'Vastness', genre: 'Chill', url: 'https://assets.mixkit.co/music/184/184.mp3' },
  { id: 'mk-588', title: 'Feedback Dreams', genre: 'Chill', url: 'https://assets.mixkit.co/music/588/588.mp3' },
  { id: 'mk-441', title: 'Meditation', genre: 'Chill', url: 'https://assets.mixkit.co/music/441/441.mp3' },
  { id: 'mk-288', title: 'One More Dance', genre: 'Pop', url: 'https://assets.mixkit.co/music/288/288.mp3' },
  { id: 'mk-250', title: 'Island Beat', genre: 'Pop', url: 'https://assets.mixkit.co/music/250/250.mp3' },
  { id: 'mk-5', title: 'Feeling Happy', genre: 'Pop', url: 'https://assets.mixkit.co/music/5/5.mp3' },
  { id: 'mk-970', title: 'Night Sky Hip Hop', genre: 'Pop', url: 'https://assets.mixkit.co/music/970/970.mp3' },
  { id: 'mk-801', title: 'Happy Home', genre: 'Pop', url: 'https://assets.mixkit.co/music/801/801.mp3' },
  { id: 'mk-1000', title: 'I Can Hear Your Heartbeat', genre: 'Pop', url: 'https://assets.mixkit.co/music/1000/1000.mp3' },
  { id: 'mk-837', title: 'Life is a Dream', genre: 'Pop', url: 'https://assets.mixkit.co/music/837/837.mp3' },
  { id: 'mk-200', title: 'Oh Lord', genre: 'Pop', url: 'https://assets.mixkit.co/music/200/200.mp3' },
  { id: 'mk-464', title: 'Sci-Fi Score', genre: 'Electronic', url: 'https://assets.mixkit.co/music/464/464.mp3' },
  { id: 'mk-729', title: 'Pop Track 03', genre: 'Electronic', url: 'https://assets.mixkit.co/music/729/729.mp3' },
  { id: 'mk-175', title: 'Digital Clouds', genre: 'Electronic', url: 'https://assets.mixkit.co/music/175/175.mp3' },
  { id: 'mk-126', title: 'Trap Electro Vibes', genre: 'Electronic', url: 'https://assets.mixkit.co/music/126/126.mp3' },
  { id: 'mk-726', title: 'Uplifting Bass', genre: 'Electronic', url: 'https://assets.mixkit.co/music/726/726.mp3' },
  { id: 'mk-136', title: 'Infected Mushroom Vibes', genre: 'Electronic', url: 'https://assets.mixkit.co/music/136/136.mp3' },
  { id: 'mk-114', title: 'Kodama Night Town', genre: 'Electronic', url: 'https://assets.mixkit.co/music/114/114.mp3' },
  { id: 'mk-27', title: 'Serene Moments', genre: 'Electronic', url: 'https://assets.mixkit.co/music/27/27.mp3' },
  { id: 'mk-493', title: 'Beautiful Dream', genre: 'Jazz', url: 'https://assets.mixkit.co/music/493/493.mp3' },
  { id: 'mk-39', title: 'Latin Lovers', genre: 'Jazz', url: 'https://assets.mixkit.co/music/39/39.mp3' },
  { id: 'mk-752', title: 'Romantic 01', genre: 'Jazz', url: 'https://assets.mixkit.co/music/752/752.mp3' },
  { id: 'mk-644', title: 'Upbeat Jazz', genre: 'Jazz', url: 'https://assets.mixkit.co/music/644/644.mp3' },
  { id: 'mk-89', title: 'Romantic Vacation', genre: 'Jazz', url: 'https://assets.mixkit.co/music/89/89.mp3' },
  { id: 'mk-528', title: 'You Got Jazz', genre: 'Jazz', url: 'https://assets.mixkit.co/music/528/528.mp3' },
  { id: 'mk-24', title: 'Smooth Like Jazz', genre: 'Jazz', url: 'https://assets.mixkit.co/music/24/24.mp3' },
  { id: 'mk-494', title: 'Chill Bro', genre: 'Jazz', url: 'https://assets.mixkit.co/music/494/494.mp3' },
];

export const MUSIC_GENRES = ['Hip-Hop', 'Chill', 'Pop', 'Electronic', 'Jazz'];

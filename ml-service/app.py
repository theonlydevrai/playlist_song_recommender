import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

load_dotenv()

app = Flask(__name__)
CORS(app)

# Feature weights for mood classification
FEATURE_WEIGHTS = {
    'valence': 1.5,      # Musical positivity
    'energy': 1.5,       # Intensity
    'danceability': 1.0, # Rhythm
    'acousticness': 0.8, # Acoustic vs electronic
    'tempo': 0.5,        # Speed (normalized)
    'loudness': 0.3,     # Volume level
    'instrumentalness': 0.4,
    'speechiness': 0.3,
    'liveness': 0.2
}

# Mood category definitions with feature ranges
MOOD_DEFINITIONS = {
    'happy_energetic': {
        'valence': (0.6, 1.0),
        'energy': (0.6, 1.0),
        'danceability': (0.5, 1.0)
    },
    'calm_peaceful': {
        'valence': (0.3, 0.7),
        'energy': (0.0, 0.4),
        'acousticness': (0.2, 1.0)
    },
    'melancholic': {
        'valence': (0.0, 0.4),
        'energy': (0.1, 0.6)
    },
    'party_dance': {
        'danceability': (0.7, 1.0),
        'energy': (0.7, 1.0),
        'valence': (0.5, 1.0)
    },
    'romantic': {
        'valence': (0.4, 0.8),
        'energy': (0.2, 0.5),
        'acousticness': (0.2, 0.8)
    },
    'motivational': {
        'energy': (0.6, 1.0),
        'valence': (0.5, 1.0),
        'tempo': (100, 180)
    },
    'chill_ambient': {
        'energy': (0.0, 0.4),
        'instrumentalness': (0.2, 1.0),
        'danceability': (0.0, 0.5)
    },
    'intense_aggressive': {
        'energy': (0.7, 1.0),
        'valence': (0.0, 0.4),
        'loudness': (-10, 0)
    }
}


def extract_features(track):
    """Extract relevant features from track data"""
    features = track.get('features', {})
    if not features:
        return None
    
    return {
        'valence': features.get('valence', 0.5),
        'energy': features.get('energy', 0.5),
        'danceability': features.get('danceability', 0.5),
        'acousticness': features.get('acousticness', 0.5),
        'tempo': features.get('tempo', 120),
        'loudness': features.get('loudness', -10),
        'instrumentalness': features.get('instrumentalness', 0),
        'speechiness': features.get('speechiness', 0),
        'liveness': features.get('liveness', 0)
    }


def classify_mood(features):
    """Classify track mood based on audio features"""
    if not features:
        return 'calm_peaceful', 0.5
    
    best_match = 'calm_peaceful'
    best_score = 0
    
    for mood, criteria in MOOD_DEFINITIONS.items():
        score = 0
        matches = 0
        
        for feature, (min_val, max_val) in criteria.items():
            if feature in features:
                value = features[feature]
                
                # Normalize tempo for comparison
                if feature == 'tempo':
                    value = (value - 60) / 140  # Normalize to 0-1 range
                    min_val = (min_val - 60) / 140
                    max_val = (max_val - 60) / 140
                
                # Normalize loudness
                if feature == 'loudness':
                    value = (value + 60) / 60  # Normalize to 0-1 range
                    min_val = (min_val + 60) / 60
                    max_val = (max_val + 60) / 60
                
                if min_val <= value <= max_val:
                    # Calculate how close to the center of the range
                    center = (min_val + max_val) / 2
                    distance = abs(value - center) / ((max_val - min_val) / 2)
                    score += (1 - distance) * FEATURE_WEIGHTS.get(feature, 1.0)
                    matches += 1
        
        if matches > 0:
            normalized_score = score / matches
            if normalized_score > best_score:
                best_score = normalized_score
                best_match = mood
    
    return best_match, min(best_score, 1.0)


def cluster_tracks(tracks, n_clusters=8):
    """Cluster tracks using K-means based on audio features"""
    if len(tracks) < n_clusters:
        n_clusters = max(2, len(tracks) // 2)
    
    # Extract feature vectors
    feature_vectors = []
    valid_tracks = []
    
    for track in tracks:
        features = extract_features(track)
        if features:
            # Create weighted feature vector
            vector = [
                features['valence'] * FEATURE_WEIGHTS['valence'],
                features['energy'] * FEATURE_WEIGHTS['energy'],
                features['danceability'] * FEATURE_WEIGHTS['danceability'],
                features['acousticness'] * FEATURE_WEIGHTS['acousticness'],
                (features['tempo'] - 60) / 140 * FEATURE_WEIGHTS['tempo'],
                (features['loudness'] + 60) / 60 * FEATURE_WEIGHTS['loudness'],
                features['instrumentalness'] * FEATURE_WEIGHTS['instrumentalness'],
                features['speechiness'] * FEATURE_WEIGHTS['speechiness'],
                features['liveness'] * FEATURE_WEIGHTS['liveness']
            ]
            feature_vectors.append(vector)
            valid_tracks.append(track)
    
    if len(feature_vectors) < 2:
        return {'categories': {}, 'tracks': tracks}
    
    # Normalize features
    scaler = StandardScaler()
    normalized_features = scaler.fit_transform(feature_vectors)
    
    # Apply K-means clustering
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(normalized_features)
    
    # Map clusters to mood categories
    categories = {mood: [] for mood in MOOD_DEFINITIONS.keys()}
    
    for i, (track, label) in enumerate(zip(valid_tracks, cluster_labels)):
        features = extract_features(track)
        mood, score = classify_mood(features)
        categories[mood].append(track['id'])
        track['moodCategory'] = mood
        track['moodScore'] = score
    
    return {
        'categories': categories,
        'tracks': valid_tracks
    }


def get_recommendations(tracks, mood_analysis, target_duration):
    """Generate recommendations based on mood analysis"""
    target_category = mood_analysis.get('mood_category', 'calm_peaceful')
    energy_target = mood_analysis.get('energy_level', 5) / 10
    valence_target = mood_analysis.get('valence_level', 5) / 10
    
    # Score each track
    scored_tracks = []
    
    for track in tracks:
        features = extract_features(track)
        if not features:
            continue
        
        score = 0
        
        # Category match (50 points max)
        if track.get('moodCategory') == target_category:
            score += 50
        
        # Energy similarity (20 points max)
        energy_diff = abs(features['energy'] - energy_target)
        score += (1 - energy_diff) * 20
        
        # Valence similarity (20 points max)
        valence_diff = abs(features['valence'] - valence_target)
        score += (1 - valence_diff) * 20
        
        # Danceability bonus (10 points max)
        if mood_analysis.get('music_characteristics', {}).get('danceability_preference') == 'high':
            if features['danceability'] > 0.6:
                score += 10
        
        scored_tracks.append({
            **track,
            'moodScore': round(score)
        })
    
    # Sort by score
    scored_tracks.sort(key=lambda x: x['moodScore'], reverse=True)
    
    # Select tracks to fit duration with artist diversity
    selected = []
    total_duration = 0
    artist_count = {}
    tolerance = 5 * 60 * 1000  # 5 minutes
    
    for track in scored_tracks:
        if track['moodScore'] < 30:
            continue
        
        artist = track.get('artist', 'Unknown')
        if artist_count.get(artist, 0) >= 2:
            continue
        
        duration = track.get('duration_ms', 200000)
        if total_duration + duration > target_duration + tolerance:
            continue
        
        selected.append({
            'trackId': track['id'],
            'name': track.get('name', 'Unknown'),
            'artist': artist,
            'duration_ms': duration,
            'moodScore': track['moodScore'],
            'reason': generate_reason(track, target_category)
        })
        
        total_duration += duration
        artist_count[artist] = artist_count.get(artist, 0) + 1
        
        if abs(total_duration - target_duration) <= tolerance:
            break
    
    return {
        'tracks': selected,
        'totalDuration': total_duration,
        'trackCount': len(selected)
    }


def generate_reason(track, target_category):
    """Generate a human-readable reason for the recommendation"""
    features = extract_features(track)
    if not features:
        return 'Matches your mood'
    
    reasons = []
    
    if features['energy'] > 0.7:
        reasons.append('high energy')
    elif features['energy'] < 0.3:
        reasons.append('calm and relaxing')
    
    if features['valence'] > 0.7:
        reasons.append('uplifting vibes')
    elif features['valence'] < 0.3:
        reasons.append('emotional depth')
    
    if features['danceability'] > 0.7:
        reasons.append('great beat')
    
    if features['acousticness'] > 0.6:
        reasons.append('acoustic feel')
    
    if track.get('moodCategory') == target_category:
        category_name = target_category.replace('_', ' ')
        reasons.append(f'perfect for {category_name} mood')
    
    return ', '.join(reasons[:2]) if reasons else 'Matches your mood'


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'ml-service'})


@app.route('/cluster', methods=['POST'])
def cluster_endpoint():
    """Cluster tracks into mood categories"""
    data = request.json
    tracks = data.get('tracks', [])
    
    if not tracks:
        return jsonify({'error': 'No tracks provided'}), 400
    
    result = cluster_tracks(tracks)
    return jsonify(result)


@app.route('/recommend', methods=['POST'])
def recommend_endpoint():
    """Get song recommendations based on mood"""
    data = request.json
    tracks = data.get('tracks', [])
    mood_analysis = data.get('moodAnalysis', {})
    target_duration = data.get('targetDuration', 30 * 60 * 1000)  # Default 30 min
    
    if not tracks:
        return jsonify({'error': 'No tracks provided'}), 400
    
    result = get_recommendations(tracks, mood_analysis, target_duration)
    return jsonify(result)


@app.route('/classify', methods=['POST'])
def classify_endpoint():
    """Classify a single track's mood"""
    data = request.json
    features = data.get('features', {})
    
    if not features:
        return jsonify({'error': 'No features provided'}), 400
    
    mood, score = classify_mood(features)
    return jsonify({
        'mood': mood,
        'confidence': score
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'True').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)

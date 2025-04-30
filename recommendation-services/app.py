from flask import Flask, jsonify, request
import pyodbc
from sklearn.metrics.pairwise import cosine_similarity
import pandas as pd
import numpy as np

app = Flask(__name__)

import os

from dotenv import load_dotenv
load_dotenv()

def get_db_connection():
    return pyodbc.connect(
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={os.environ.get('DB_SERVER')};"
        f"DATABASE={os.environ.get('DB_NAME')};"
        f"UID={os.environ.get('DB_USERNAME')};"
        f"PWD={os.environ.get('DB_PASSWORD')};"
    )

# Fetch all movies with their genres
def get_all_movies(cursor):
    cursor.execute("""
        SELECT M.movie_id, M.title, G.genre_name
        FROM Movies M
        JOIN movie_genres MG ON M.movie_id = MG.movie_id
        JOIN genres G ON MG.genre_id = G.genre_id
    """)
    rows = cursor.fetchall()
    if not rows:
        return pd.DataFrame(columns=['movie_id', 'title', 'genre'])
    return pd.DataFrame([tuple(row) for row in rows], columns=['movie_id', 'title', 'genre'])

# Get user's liked/watched/highly-rated movies
def get_user_movies(user_id, cursor):
    cursor.execute("""
        SELECT DISTINCT M.movie_id, M.title, G.genre_name
        FROM (
            SELECT movie_id FROM Likes WHERE user_id = ?
            UNION ALL
            SELECT movie_id FROM Watchlist WHERE user_id = ?
            UNION ALL
            SELECT movie_id FROM Ratings WHERE user_id = ? AND rating >= 8
        ) AS UserMovies
        JOIN Movies M ON M.movie_id = UserMovies.movie_id
        JOIN movie_genres MG ON M.movie_id = MG.movie_id
        JOIN genres G ON MG.genre_id = G.genre_id
    """, (user_id, user_id, user_id))
    rows = cursor.fetchall()
    if not rows:
        return pd.DataFrame(columns=['movie_id', 'title', 'genre'])
    return pd.DataFrame([tuple(row) for row in rows], columns=['movie_id', 'title', 'genre'])

# Get all movie_ids user has interacted with
def get_user_interacted_ids(user_id, cursor):
    cursor.execute("""
        SELECT movie_id FROM Likes WHERE user_id = ?
        UNION
        SELECT movie_id FROM Watchlist WHERE user_id = ?
        UNION
        SELECT movie_id FROM Ratings WHERE user_id = ?
    """, (user_id, user_id, user_id))
    return set(row[0] for row in cursor.fetchall())

# Recommend using cosine similarity of genre vectors
def recommend_movies(user_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    all_movies = get_all_movies(cursor)
    user_movies = get_user_movies(user_id, cursor)
    excluded_ids = get_user_interacted_ids(user_id, cursor)

    if user_movies.empty or all_movies.empty:
        return []

    # Create genre vectors (multi-hot encoding)
    movie_genre_matrix = pd.crosstab(all_movies['movie_id'], all_movies['genre'])

    # Get user profile vector (average of user's liked/watched/rated movie vectors)
    user_movie_ids = user_movies['movie_id'].unique()
    user_profile = movie_genre_matrix.loc[movie_genre_matrix.index.isin(user_movie_ids)].mean().values.reshape(1, -1)

    # Filter out already interacted movies
    candidate_movie_ids = movie_genre_matrix.index.difference(user_movie_ids)
    if len(candidate_movie_ids) == 0:
        return []

    candidates_matrix = movie_genre_matrix.loc[candidate_movie_ids]

    # Compute cosine similarity between each candidate and user profile
    similarity_scores = cosine_similarity(candidates_matrix.values, user_profile).flatten()
    top_indices = np.argsort(similarity_scores)[::-1][:100]

    # Get top recommended movie IDs
    top_movie_ids = candidates_matrix.index[top_indices]
    recommended_df = all_movies[all_movies['movie_id'].isin(top_movie_ids)][['movie_id', 'title']].drop_duplicates()

    connection.close()
    return recommended_df['title'].tolist()

# API Endpoint
@app.route('/recommendations', methods=['POST'])
def get_recommendations():
    data = request.get_json()
    user_id = data.get('user_id')

    if not user_id:
        return jsonify({"error": "user_id is required in JSON body"}), 400

    try:
        recommendations = recommend_movies(user_id)
        return jsonify({"recommended_movies": recommendations}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)

# ConnectHub – Social Media Platform

ConnectHub is a full-stack social media web app where users can sign up, share posts with photos, like and comment, follow other people, and search for users. It was built as an internship project with a plain HTML/CSS/JavaScript frontend and a Node.js + Express + MongoDB REST API.

## Features
- **Authentication:** register, log in, log out, JWT sessions, bcrypt-hashed passwords, protected routes, form validation with clear error/success messages
- **Profiles:** picture, name, username, bio, followers/following counts, user's posts; edit profile and change picture
- **Feed:** create / edit / delete posts (text and optional image), "Explore" and "Following" tabs, pagination
- **Likes:** like/unlike with duplicate protection and live counts
- **Comments:** view, add and delete your own comments
- **Follow system:** follow/unfollow (cannot follow yourself), stored in MongoDB
- **Search:** find users by name or username
- **UI:** responsive (desktop → mobile bottom navigation), dark/light theme, loading, empty and error states, toast notifications

## Technologies
| Layer | Tools |
|-------|-------|
| Frontend | HTML5, CSS3 (CSS variables), Vanilla JavaScript (ES6+), Font Awesome |
| Backend | Node.js, Express.js, REST API |
| Database | MongoDB + Mongoose |
| Auth & Security | JWT, bcrypt (bcryptjs), input validation, ownership checks, `.env` secrets |

## Screenshots
> Add your screenshots to a `screenshots/` folder and link them here.

| Feed | Profile | Search |
|------|---------|--------|
| ![Feed](screenshots/feed.png) | ![Profile](screenshots/profile.png) | ![Search](screenshots/search.png) |

## Project Structure
```
connecthub/
├── frontend/   (HTML pages, css/style.css, js/*.js)
├── backend/    (config, controllers, middleware, models, routes, server.js, seed.js)
├── .env.example
├── .gitignore
└── README.md
```

## Installation
**Prerequisites:** Node.js 18+ and MongoDB (local install or a free MongoDB Atlas cluster).

```bash
git clone https://github.com/<your-username>/connecthub.git
cd connecthub
cp .env.example .env          # Windows: copy .env.example .env
# edit .env with your values (see below)
cd backend
npm install
npm run dev
```
Open **http://localhost:5000**

## Environment Variables (`.env` in the project root)
| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default 5000) |
| `MONGODB_URI` | e.g. `mongodb://127.0.0.1:27017/connecthub` or your Atlas string |
| `JWT_SECRET` | Long random string used to sign tokens |

## Running
- **Backend + frontend (recommended):** `cd backend && npm run dev` — Express also serves the `frontend/` folder, so everything lives at http://localhost:5000.
- **Frontend separately (optional):** open `frontend/` with VS Code Live Server. The API client automatically targets `http://localhost:5000/api`. The backend must still be running.
- **Demo data:** `npm run seed` creates users `alice@example.com`, `bob@example.com`, `carol@example.com` (password `Password123`). ⚠️ It clears existing data.

## API Overview
All routes except register/login require `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Log in |
| GET | `/api/auth/me` | Current user |
| GET | `/api/users?search=` | Search users / suggestions |
| GET | `/api/users/:id` | Get profile |
| PUT | `/api/users/:id` | Update own profile |
| POST / DELETE | `/api/users/:id/follow` | Follow / unfollow |
| GET | `/api/posts?page=&user=&feed=following` | List posts |
| GET | `/api/posts/:id` | Single post |
| POST | `/api/posts` | Create post |
| PUT / DELETE | `/api/posts/:id` | Edit / delete own post |
| POST / DELETE | `/api/posts/:id/like` | Like / unlike |
| GET / POST | `/api/posts/:postId/comments` | List / add comments |
| DELETE | `/api/comments/:id` | Delete own comment |

## Database
MongoDB collections (Mongoose models): **User** (name, username, email, password hash, profilePicture, bio, followers[], following[], createdAt), **Post** (user ref, content, image, likes[], timestamps), **Comment** (user ref, post ref, text, createdAt). Images are resized in the browser and stored as base64 strings to keep the project simple.

## Future Improvements
Real-time notifications (Socket.io), image storage on Cloudinary/S3, direct messages, hashtags, password reset by email, unit/integration tests, rate limiting, refresh tokens.

## License
MIT

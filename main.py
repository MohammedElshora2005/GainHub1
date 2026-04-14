import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import or_, and_
from dotenv import load_dotenv
from datetime import datetime
import re
import base64

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default-dev-key-789')

# Database configuration
database_url = os.getenv('POSTGRES_URL')
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = database_url or 'sqlite:///gainhub.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'index'

# Email configuration (READ FROM .env)
EMAIL_USER = os.getenv('EMAIL_USER')
EMAIL_PASS = os.getenv('EMAIL_PASS')

# ============================================
# Database Models
# ============================================

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    profile_pic = db.Column(db.Text, default='https://cdn-icons-png.flaticon.com/512/149/149071.png')
    category = db.Column(db.String(50), default='tech')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)
    is_online = db.Column(db.Boolean, default=False)
    
    # Relationships
    skills = db.relationship('Skill', backref='owner', lazy=True, cascade='all, delete-orphan')
    sent_requests = db.relationship('FriendRequest', foreign_keys='FriendRequest.sender_id', backref='sender', lazy=True)
    received_requests = db.relationship('FriendRequest', foreign_keys='FriendRequest.receiver_id', backref='receiver', lazy=True)
    sent_messages = db.relationship('Message', foreign_keys='Message.sender_id', backref='sender_user', lazy=True)
    received_messages = db.relationship('Message', foreign_keys='Message.receiver_id', backref='receiver_user', lazy=True)
    given_reviews = db.relationship('Review', foreign_keys='Review.reviewer_id', backref='reviewer', lazy=True)
    received_reviews = db.relationship('Review', foreign_keys='Review.reviewed_id', backref='reviewed', lazy=True)
    
    def update_last_seen(self):
        self.last_seen = datetime.utcnow()
        db.session.commit()
    
    def get_average_rating(self):
        reviews = Review.query.filter_by(reviewed_id=self.id).all()
        if not reviews:
            return 0
        return sum(r.rating for r in reviews) / len(reviews)
    
    def get_review_count(self):
        return Review.query.filter_by(reviewed_id=self.id).count()

class Skill(db.Model):
    __tablename__ = 'skills'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'offer' or 'request'
    category = db.Column(db.String(50), default='tech')
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

class FriendRequest(db.Model):
    __tablename__ = 'friend_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, accepted, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('sender_id', 'receiver_id', name='unique_request'),)

class Message(db.Model):
    __tablename__ = 'messages'
    
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class Review(db.Model):
    __tablename__ = 'reviews'
    
    id = db.Column(db.Integer, primary_key=True)
    reviewer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    reviewed_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1-5
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('reviewer_id', 'reviewed_id', name='unique_review'),)

class BlockedUser(db.Model):
    __tablename__ = 'blocked_users'
    
    id = db.Column(db.Integer, primary_key=True)
    blocker_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    blocked_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ContactMessage(db.Model):
    __tablename__ = 'contact_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=True)
    email = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, default=False)

# ============================================
# Helper Functions
# ============================================

def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    # At least 6 characters, 1 number, 1 letter
    return len(password) >= 6 and any(c.isdigit() for c in password) and any(c.isalpha() for c in password)

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

# ============================================
# Routes
# ============================================

@app.route('/')
def index():
    return render_template('skillFrontend.html')

@app.route('/api/users')
def get_users_api():
    users = User.query.all()
    user_list = []
    
    for user in users:
        if current_user.is_authenticated and user.id == current_user.id:
            continue
        
        # Check if blocked
        is_blocked = False
        if current_user.is_authenticated:
            blocked = BlockedUser.query.filter(
                and_(
                    BlockedUser.blocker_id == current_user.id,
                    BlockedUser.blocked_id == user.id
                )
            ).first()
            if blocked:
                continue
            # Check if current user is blocked by this user
            blocked_by = BlockedUser.query.filter(
                and_(
                    BlockedUser.blocker_id == user.id,
                    BlockedUser.blocked_id == current_user.id
                )
            ).first()
            if blocked_by:
                continue
        
        rel_status = "none"
        if current_user.is_authenticated:
            rel = FriendRequest.query.filter(
                or_(
                    and_(FriendRequest.sender_id == current_user.id, FriendRequest.receiver_id == user.id),
                    and_(FriendRequest.sender_id == user.id, FriendRequest.receiver_id == current_user.id)
                )
            ).first()
            if rel:
                rel_status = rel.status
        
        offer = Skill.query.filter_by(user_id=user.id, type='offer').first()
        learn = Skill.query.filter_by(user_id=user.id, type='request').first()
        
        user_list.append({
            "id": user.id,
            "username": user.username,
            "profile_pic": user.profile_pic,
            "skillOffer": offer.title if offer else "Generalist",
            "skillLearn": learn.title if learn else "Everything",
            "category": user.category,
            "relationship": rel_status,
            "rating": user.get_average_rating(),
            "reviewCount": user.get_review_count(),
            "is_online": user.is_online,
            "is_blocked": is_blocked
        })
    
    return jsonify(user_list)

@app.route('/api/my_friends')
@login_required
def get_my_friends():
    # Get all accepted friend requests
    friends = FriendRequest.query.filter(
        and_(
            or_(
                FriendRequest.sender_id == current_user.id,
                FriendRequest.receiver_id == current_user.id
            ),
            FriendRequest.status == 'accepted'
        )
    ).all()
    
    friend_list = []
    for friend_rel in friends:
        friend_id = friend_rel.sender_id if friend_rel.receiver_id == current_user.id else friend_rel.receiver_id
        friend = User.query.get(friend_id)
        
        # Check if blocked
        blocked = BlockedUser.query.filter(
            or_(
                and_(BlockedUser.blocker_id == current_user.id, BlockedUser.blocked_id == friend_id),
                and_(BlockedUser.blocker_id == friend_id, BlockedUser.blocked_id == current_user.id)
            )
        ).first()
        if blocked:
            continue
        
        offer = Skill.query.filter_by(user_id=friend.id, type='offer').first()
        learn = Skill.query.filter_by(user_id=friend.id, type='request').first()
        
        friend_list.append({
            "id": friend.id,
            "username": friend.username,
            "profile_pic": friend.profile_pic,
            "skillOffer": offer.title if offer else "Generalist",
            "skillLearn": learn.title if learn else "Everything",
            "is_online": friend.is_online
        })
    
    return jsonify(friend_list)

@app.route('/register', methods=['POST'])
def register():
    username = request.form.get('username')
    email = request.form.get('email')
    password = request.form.get('password')
    skill_offer = request.form.get('skillOffer')
    skill_learn = request.form.get('skillLearn')
    category = request.form.get('skillCategory', 'tech')
    
    # Validation
    if not username or not email or not password:
        return redirect(url_for('index', section='signup', error='All fields required'))
    
    if not validate_email(email):
        return redirect(url_for('index', section='signup', error='Invalid email format'))
    
    if not validate_password(password):
        return redirect(url_for('index', section='signup', error='Password must be at least 6 characters with letters and numbers'))
    
    if User.query.filter_by(email=email).first():
        return redirect(url_for('index', section='signup', error='Email already exists'))
    
    if User.query.filter_by(username=username).first():
        return redirect(url_for('index', section='signup', error='Username already taken'))
    
    # Create user
    new_user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password, method='pbkdf2:sha256'),
        category=category
    )
    db.session.add(new_user)
    db.session.commit()
    
    # Add skills
    if skill_offer:
        db.session.add(Skill(title=skill_offer, type='offer', category=category, user_id=new_user.id))
    if skill_learn:
        db.session.add(Skill(title=skill_learn, type='request', category=category, user_id=new_user.id))
    db.session.commit()
    
    login_user(new_user)
    return redirect(url_for('index', section='profile'))

@app.route('/login', methods=['POST'])
def login():
    email = request.form.get('email')
    password = request.form.get('password')
    
    user = User.query.filter_by(email=email).first()
    if user and check_password_hash(user.password_hash, password):
        user.is_online = True
        user.update_last_seen()
        login_user(user)
        return redirect(url_for('index', section='profile'))
    
    return redirect(url_for('index', section='login', error='Invalid email or password'))

@app.route('/logout')
def logout():
    if current_user.is_authenticated:
        current_user.is_online = False
        current_user.update_last_seen()
    logout_user()
    return redirect(url_for('index'))

@app.route('/api/current_user')
@login_required
def get_current_user():
    return jsonify({
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "profile_pic": current_user.profile_pic,
        "category": current_user.category,
        "rating": current_user.get_average_rating(),
        "reviewCount": current_user.get_review_count()
    })

# ============================================
# Edit Profile
# ============================================

@app.route('/api/update_profile', methods=['PUT'])
@login_required
def update_profile():
    try:
        data = request.get_json()
        new_username = data.get('username')
        new_skill_offer = data.get('skillOffer')
        new_skill_learn = data.get('skillLearn')
        new_category = data.get('category')
        
        # Check if username is taken (if changed)
        if new_username != current_user.username:
            existing = User.query.filter_by(username=new_username).first()
            if existing:
                return jsonify({"success": False, "error": "Username already taken"}), 400
        
        # Update user
        current_user.username = new_username
        current_user.category = new_category
        
        # Update skills
        offer_skill = Skill.query.filter_by(user_id=current_user.id, type='offer').first()
        if offer_skill:
            offer_skill.title = new_skill_offer
        elif new_skill_offer:
            db.session.add(Skill(title=new_skill_offer, type='offer', category=new_category, user_id=current_user.id))
        
        learn_skill = Skill.query.filter_by(user_id=current_user.id, type='request').first()
        if learn_skill:
            learn_skill.title = new_skill_learn
        elif new_skill_learn:
            db.session.add(Skill(title=new_skill_learn, type='request', category=new_category, user_id=current_user.id))
        
        db.session.commit()
        return jsonify({"success": True})
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating profile: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ============================================
# Delete Account (Fixed)
# ============================================

@app.route('/api/delete_account', methods=['DELETE'])
@login_required
def delete_account():
    try:
        data = request.get_json()
        username = data.get('username')
        
        # Verify username matches
        if username != current_user.username:
            return jsonify({"success": False, "error": "Username does not match"}), 400
        
        # Delete all related data first
        FriendRequest.query.filter(
            or_(
                FriendRequest.sender_id == current_user.id,
                FriendRequest.receiver_id == current_user.id
            )
        ).delete(synchronize_session=False)
        
        Message.query.filter(
            or_(
                Message.sender_id == current_user.id,
                Message.receiver_id == current_user.id
            )
        ).delete(synchronize_session=False)
        
        Review.query.filter(
            or_(
                Review.reviewer_id == current_user.id,
                Review.reviewed_id == current_user.id
            )
        ).delete(synchronize_session=False)
        
        BlockedUser.query.filter(
            or_(
                BlockedUser.blocker_id == current_user.id,
                BlockedUser.blocked_id == current_user.id
            )
        ).delete(synchronize_session=False)
        
        Skill.query.filter_by(user_id=current_user.id).delete(synchronize_session=False)
        
        # Delete user
        db.session.delete(current_user)
        db.session.commit()
        
        logout_user()
        return jsonify({"success": True})
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting account: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ============================================
# User Skills API (for profile page)
# ============================================

@app.route('/api/user_skills/<int:user_id>')
@login_required
def get_user_skills(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    offer = Skill.query.filter_by(user_id=user_id, type='offer').first()
    learn = Skill.query.filter_by(user_id=user_id, type='request').first()
    
    return jsonify({
        "skillOffer": offer.title if offer else "Not specified",
        "skillLearn": learn.title if learn else "Not specified"
    })

# ============================================
# Contact Messages (Database + Email)
# ============================================

def send_email_notification(user_email, user_message):
    """Helper function to send email notification"""
    if not EMAIL_USER or not EMAIL_PASS:
        print("⚠️ Email credentials missing. Cannot send email.")
        return False
    
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = EMAIL_USER
        msg['To'] = EMAIL_USER  # Send to admin (you)
        msg['Subject'] = f"📬 New Contact Message from {user_email}"
        
        # Email body
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2 style="color: #667eea;">✨ New Contact Message from Gainhub</h2>
            <p><strong>📧 From:</strong> {user_email}</p>
            <p><strong>⏰ Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            <hr style="border: 1px solid #ddd;">
            <p><strong>💬 Message:</strong></p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 10px 0;">
                {user_message.replace(chr(10), '<br>')}
            </div>
            <hr style="border: 1px solid #ddd;">
            <small style="color: #888;">📬 Sent from Gainhub Contact Form</small>
            <br>
            <small style="color: #888;">💡 You can also view this message in the admin panel</small>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        # Send email with timeout handling
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=30) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASS)
            server.send_message(msg)
        
        print(f"✅ Email notification sent successfully to {EMAIL_USER}")
        return True
        
    except smtplib.SMTPAuthenticationError:
        print("❌ Email authentication failed! Check your EMAIL_USER and EMAIL_PASS in .env")
        return False
    except smtplib.SMTPException as e:
        print(f"❌ SMTP error: {e}")
        return False
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        return False

@app.route('/api/contact', methods=['POST'])
def contact_api():
    try:
        data = request.get_json()
        user_email = data.get('email')
        user_msg = data.get('message')
        user_name = data.get('name', '')
        
        if not user_email or not user_msg:
            return jsonify({"success": False, "error": "Email and message required"}), 400
        
        # Validate email format
        if not validate_email(user_email):
            return jsonify({"success": False, "error": "Invalid email format"}), 400
        
        # 1. Save to database
        new_message = ContactMessage(
            name=user_name,
            email=user_email,
            message=user_msg
        )
        db.session.add(new_message)
        db.session.commit()
        print(f"💾 Message saved to database from {user_email}")
        
        # 2. Send email notification
        email_sent = send_email_notification(user_email, user_msg)
        
        if email_sent:
            return jsonify({"success": True, "message": "✓ Message sent successfully! We'll get back to you soon."})
        else:
            return jsonify({"success": True, "message": "✓ Message saved! (Email notification failed, but we received your message.)"})
        
    except Exception as e:
        print(f"❌ Error in contact_api: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/contact_messages')
@login_required
def get_contact_messages():
    # Only admin can view messages - change email to yours
    admin_email = os.getenv('ADMIN_EMAIL', 'muhammedhosni70@gmail.com')
    if current_user.email != admin_email:
        return jsonify({"error": "Unauthorized"}), 403
    
    messages = ContactMessage.query.order_by(ContactMessage.created_at.desc()).all()
    return jsonify([{
        "id": m.id,
        "name": m.name,
        "email": m.email,
        "message": m.message,
        "created_at": m.created_at.isoformat(),
        "is_read": m.is_read
    } for m in messages])

@app.route('/api/mark_message_read/<int:msg_id>', methods=['POST'])
@login_required
def mark_message_read(msg_id):
    admin_email = os.getenv('ADMIN_EMAIL', 'muhammedhosni70@gmail.com')
    if current_user.email != admin_email:
        return jsonify({"error": "Unauthorized"}), 403
    
    msg = ContactMessage.query.get(msg_id)
    if msg:
        msg.is_read = True
        db.session.commit()
        return jsonify({"success": True})
    
    return jsonify({"success": False, "error": "Message not found"}), 404

@app.route('/admin/messages')
@login_required
def admin_messages():
    admin_email = os.getenv('ADMIN_EMAIL', 'muhammedhosni70@gmail.com')
    if current_user.email != admin_email:
        return "Unauthorized", 403
    
    messages = ContactMessage.query.order_by(ContactMessage.created_at.desc()).all()
    
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Admin - Contact Messages</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f2f5; padding: 20px; }
            .container { max-width: 1000px; margin: 0 auto; }
            h1 { color: #1a1a2e; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
            .stats { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 20px; border-radius: 12px; margin-bottom: 20px; }
            .message { background: white; padding: 18px; margin: 12px 0; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.3s; }
            .message:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(0,0,0,0.15); }
            .unread { border-left: 5px solid #667eea; background: #f8f9ff; }
            .email { color: #667eea; font-weight: bold; font-size: 14px; margin-bottom: 5px; }
            .date { color: #888; font-size: 11px; margin-bottom: 10px; }
            .message-text { color: #333; line-height: 1.5; margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee; }
            .badge { background: #667eea; color: white; padding: 2px 8px; border-radius: 20px; font-size: 11px; margin-left: 10px; }
            .refresh-btn { background: #667eea; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; margin-bottom: 20px; }
            .refresh-btn:hover { background: #5a67d8; }
            .nav-link { display: inline-block; margin-top: 20px; color: #667eea; text-decoration: none; }
            .nav-link:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📬 Contact Messages <span class="badge">Admin Panel</span></h1>
            <div class="stats">
                <strong>Total Messages:</strong> """ + str(len(messages)) + """
            </div>
            <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
    """
    
    for msg in messages:
        unread_class = "unread" if not msg.is_read else ""
        read_status = "🔴 Unread" if not msg.is_read else "✅ Read"
        html += f"""
        <div class="message {unread_class}">
            <div class="email">📧 From: {msg.email}</div>
            <div class="date">📅 {msg.created_at.strftime('%Y-%m-%d %H:%M:%S')} | {read_status}</div>
            <div class="message-text">{msg.message.replace(chr(10), '<br>')}</div>
        </div>
        """
    
    html += """
            <a href="/" class="nav-link">← Back to Gainhub</a>
        </div>
    </body>
    </html>
    """
    return html

# ============================================
# Update Profile Picture (with Base64 support)
# ============================================

@app.route('/api/update_profile_pic', methods=['POST'])
@login_required
def update_profile_pic():
    try:
        data = request.get_json()
        new_pic = data.get('profile_pic')
        
        if not new_pic:
            return jsonify({"success": False, "error": "No image provided"}), 400
        
        # Handle base64 image upload
        if new_pic and new_pic.startswith('data:image'):
            current_user.profile_pic = new_pic
            db.session.commit()
            print(f"✅ Profile picture updated for {current_user.username}")
            return jsonify({"success": True})
        
        # Handle regular URL
        if new_pic and new_pic.startswith('http'):
            current_user.profile_pic = new_pic
            db.session.commit()
            return jsonify({"success": True})
        
        return jsonify({"success": False, "error": "Invalid image format"}), 400
        
    except Exception as e:
        print(f"❌ Error updating profile picture: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ============================================
# Friend Request Routes
# ============================================

@app.route('/api/send_request/<int:receiver_id>', methods=['POST'])
@login_required
def send_request(receiver_id):
    if receiver_id == current_user.id:
        return jsonify({"success": False, "error": "Cannot send request to yourself"}), 400
    
    # Check if request already exists
    existing = FriendRequest.query.filter(
        or_(
            and_(FriendRequest.sender_id == current_user.id, FriendRequest.receiver_id == receiver_id),
            and_(FriendRequest.sender_id == receiver_id, FriendRequest.receiver_id == current_user.id)
        )
    ).first()
    
    if existing:
        return jsonify({"success": False, "error": "Request already exists"}), 400
    
    # Check if blocked
    blocked = BlockedUser.query.filter(
        and_(
            BlockedUser.blocker_id == current_user.id,
            BlockedUser.blocked_id == receiver_id
        )
    ).first()
    
    if blocked:
        return jsonify({"success": False, "error": "Cannot send request to blocked user"}), 400
    
    friend_request = FriendRequest(sender_id=current_user.id, receiver_id=receiver_id)
    db.session.add(friend_request)
    db.session.commit()
    
    return jsonify({"success": True})

@app.route('/api/my_requests')
@login_required
def get_my_requests():
    requests = FriendRequest.query.filter_by(receiver_id=current_user.id, status='pending').all()
    return jsonify([{
        "id": r.id,
        "sender_name": r.sender.username,
        "sender_pic": r.sender.profile_pic
    } for r in requests])

@app.route('/api/handle_request/<int:req_id>/<string:action>', methods=['POST'])
@login_required
def handle_request(req_id, action):
    friend_request = FriendRequest.query.get(req_id)
    
    if not friend_request or friend_request.receiver_id != current_user.id:
        return jsonify({"success": False, "error": "Unauthorized"}), 403
    
    if action == 'accept':
        friend_request.status = 'accepted'
        db.session.commit()
    elif action == 'reject':
        db.session.delete(friend_request)
        db.session.commit()
    else:
        return jsonify({"success": False, "error": "Invalid action"}), 400
    
    return jsonify({"success": True})

# ============================================
# Chat Routes
# ============================================

@app.route('/api/chat/<int:other_id>', methods=['GET', 'POST'])
@login_required
def chat_api(other_id):
    # Check if blocked
    blocked = BlockedUser.query.filter(
        or_(
            and_(BlockedUser.blocker_id == current_user.id, BlockedUser.blocked_id == other_id),
            and_(BlockedUser.blocker_id == other_id, BlockedUser.blocked_id == current_user.id)
        )
    ).first()
    
    if blocked:
        return jsonify({"error": "Blocked"}), 403
    
    if request.method == 'POST':
        data = request.get_json()
        content = data.get('message', '').strip()
        
        if not content:
            return jsonify({"success": False, "error": "Empty message"}), 400
        
        # Check if they are friends
        are_friends = FriendRequest.query.filter(
            and_(
                or_(FriendRequest.sender_id == current_user.id, FriendRequest.sender_id == other_id),
                or_(FriendRequest.receiver_id == current_user.id, FriendRequest.receiver_id == other_id),
                FriendRequest.status == 'accepted'
            )
        ).first()
        
        if not are_friends:
            return jsonify({"success": False, "error": "Not friends"}), 403
        
        message = Message(
            sender_id=current_user.id,
            receiver_id=other_id,
            content=content
        )
        db.session.add(message)
        db.session.commit()
        
        return jsonify({"success": True})
    
    # GET - load messages
    messages = Message.query.filter(
        or_(
            and_(Message.sender_id == current_user.id, Message.receiver_id == other_id),
            and_(Message.sender_id == other_id, Message.receiver_id == current_user.id)
        )
    ).order_by(Message.timestamp.asc()).all()
    
    # Mark messages as read
    for msg in messages:
        if msg.receiver_id == current_user.id and not msg.is_read:
            msg.is_read = True
    db.session.commit()
    
    return jsonify([{
        "sender": m.sender_id,
        "text": m.content,
        "timestamp": m.timestamp.isoformat(),
        "is_read": m.is_read
    } for m in messages])

# ============================================
# Review Routes
# ============================================

@app.route('/api/my_reviews')
@login_required
def get_my_reviews():
    reviews = Review.query.filter_by(reviewed_id=current_user.id).order_by(Review.created_at.desc()).all()
    return jsonify([{
        "id": r.id,
        "reviewer_name": r.reviewer.username,
        "reviewer_pic": r.reviewer.profile_pic,
        "rating": r.rating,
        "comment": r.comment,
        "created_at": r.created_at.isoformat()
    } for r in reviews])

@app.route('/api/submit_review/<int:user_id>', methods=['POST'])
@login_required
def submit_review(user_id):
    data = request.get_json()
    rating = data.get('rating')
    comment = data.get('comment', '')
    
    if not rating or not 1 <= rating <= 5:
        return jsonify({"success": False, "error": "Invalid rating"}), 400
    
    # Check if already reviewed
    existing = Review.query.filter_by(reviewer_id=current_user.id, reviewed_id=user_id).first()
    if existing:
        return jsonify({"success": False, "error": "Already reviewed"}), 400
    
    # Check if they are friends
    are_friends = FriendRequest.query.filter(
        and_(
            or_(FriendRequest.sender_id == current_user.id, FriendRequest.sender_id == user_id),
            or_(FriendRequest.receiver_id == current_user.id, FriendRequest.receiver_id == user_id),
            FriendRequest.status == 'accepted'
        )
    ).first()
    
    if not are_friends:
        return jsonify({"success": False, "error": "Can only review friends"}), 403
    
    review = Review(
        reviewer_id=current_user.id,
        reviewed_id=user_id,
        rating=rating,
        comment=comment
    )
    db.session.add(review)
    db.session.commit()
    
    return jsonify({"success": True})

# ============================================
# Block User Routes
# ============================================

@app.route('/api/block_user/<int:user_id>', methods=['POST'])
@login_required
def block_user(user_id):
    if user_id == current_user.id:
        return jsonify({"success": False, "error": "Cannot block yourself"}), 400
    
    existing = BlockedUser.query.filter_by(blocker_id=current_user.id, blocked_id=user_id).first()
    if existing:
        return jsonify({"success": False, "error": "Already blocked"}), 400
    
    # Delete any friend request between them
    friend_request = FriendRequest.query.filter(
        or_(
            and_(FriendRequest.sender_id == current_user.id, FriendRequest.receiver_id == user_id),
            and_(FriendRequest.sender_id == user_id, FriendRequest.receiver_id == current_user.id)
        )
    ).first()
    
    if friend_request:
        db.session.delete(friend_request)
    
    blocked = BlockedUser(blocker_id=current_user.id, blocked_id=user_id)
    db.session.add(blocked)
    db.session.commit()
    
    return jsonify({"success": True})

@app.route('/api/unblock_user/<int:user_id>', methods=['POST'])
@login_required
def unblock_user(user_id):
    blocked = BlockedUser.query.filter_by(blocker_id=current_user.id, blocked_id=user_id).first()
    if blocked:
        db.session.delete(blocked)
        db.session.commit()
    
    return jsonify({"success": True})

# ============================================
# Online Status Update
# ============================================

@app.route('/api/update_online_status', methods=['POST'])
@login_required
def update_online_status():
    data = request.get_json()
    is_online = data.get('is_online', False)
    current_user.is_online = is_online
    current_user.update_last_seen()
    return jsonify({"success": True})

# ============================================
# Create tables on startup (for Vercel)
# ============================================

with app.app_context():
    db.create_all()
    print("✅ Database tables checked/created successfully!")

# ============================================
# This is for Vercel - the app object must be named 'app'
# ============================================

# The 'app' variable is already defined above, Vercel will use it

# ============================================
# Run App (for local development only)
# ============================================

if __name__ == '__main__':
    print("=" * 50)
    print("🚀 Gainhub Server Started!")
    print(f"📍 URL: http://localhost:5000")
    print(f"📧 Admin Email: {os.getenv('ADMIN_EMAIL', 'muhammedhosni70@gmail.com')}")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=True)

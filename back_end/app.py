from flask import Flask
from flask_cors import CORS
from routes.upload import upload_bp
from routes.resume import resume_bp
from routes.job_ads import job_ads_bp
from routes.completed_resumes import completed_resumes_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(upload_bp)
app.register_blueprint(resume_bp)
app.register_blueprint(job_ads_bp)
app.register_blueprint(completed_resumes_bp)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
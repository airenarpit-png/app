"""
Seed script to populate the database with sample data for Decode Maths Now
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
import uuid
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def seed_database():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🌱 Starting database seeding...")
    
    # Clear existing data
    print("📝 Clearing existing data...")
    await db.users.delete_many({})
    await db.chapters.delete_many({})
    await db.questions.delete_many({})
    await db.chapter_videos.delete_many({})
    await db.test_attempts.delete_many({})
    await db.question_reports.delete_many({})
    
    # Create admin user
    print("👤 Creating admin user...")
    admin_user = {
        "user_id": str(uuid.uuid4()),
        "name": "Admin",
        "mobile_number": "9999999999",
        "email": "admin@decodemathsnow.com",
        "password_hash": hash_password("admin123"),
        "class_level": "10",
        "school_name": "Decode Maths",
        "city": "Delhi",
        "registration_date": datetime.now(timezone.utc).isoformat(),
        "is_admin": True
    }
    await db.users.insert_one(admin_user)
    print("✅ Admin created - Mobile: 9999999999, Password: admin123")
    
    # Create sample student user
    print("👤 Creating sample student user...")
    student_user = {
        "user_id": str(uuid.uuid4()),
        "name": "Rahul Kumar",
        "mobile_number": "9876543210",
        "email": "rahul@example.com",
        "password_hash": hash_password("student123"),
        "class_level": "10",
        "school_name": "Delhi Public School",
        "city": "Delhi",
        "registration_date": datetime.now(timezone.utc).isoformat(),
        "is_admin": False
    }
    await db.users.insert_one(student_user)
    print("✅ Student created - Mobile: 9876543210, Password: student123")
    
    # Sample chapters for each class
    chapters_data = [
        # Class 10
        {"class_level": "10", "chapter_name": "Real Numbers", "subject": "Mathematics", 
         "description": "Euclid's division lemma, Fundamental Theorem of Arithmetic", "order": 1},
        {"class_level": "10", "chapter_name": "Polynomials", "subject": "Mathematics",
         "description": "Zeroes of a polynomial, Relationship between zeroes and coefficients", "order": 2},
        {"class_level": "10", "chapter_name": "Pair of Linear Equations in Two Variables", "subject": "Mathematics",
         "description": "Graphical and Algebraic solutions, Cross-multiplication method", "order": 3},
        
        # Class 11
        {"class_level": "11", "chapter_name": "Sets", "subject": "Mathematics",
         "description": "Sets and their representations, Operations on sets, Venn diagrams", "order": 1},
        {"class_level": "11", "chapter_name": "Relations and Functions", "subject": "Mathematics",
         "description": "Types of relations, Types of functions, Composition of functions", "order": 2},
        {"class_level": "11", "chapter_name": "Trigonometric Functions", "subject": "Mathematics",
         "description": "Angles, Trigonometric functions, Trigonometric equations", "order": 3},
        
        # Class 12
        {"class_level": "12", "chapter_name": "Relations and Functions", "subject": "Mathematics",
         "description": "Types of relations, Types of functions, Inverse functions", "order": 1},
        {"class_level": "12", "chapter_name": "Inverse Trigonometric Functions", "subject": "Mathematics",
         "description": "Basic concepts, Properties of inverse trigonometric functions", "order": 2},
        {"class_level": "12", "chapter_name": "Matrices", "subject": "Mathematics",
         "description": "Concepts, Types of matrices, Operations on matrices", "order": 3},
    ]
    
    print("📚 Creating chapters...")
    chapters = []
    for chapter_data in chapters_data:
        chapter = {**chapter_data, "chapter_id": str(uuid.uuid4())}
        chapters.append(chapter)
        await db.chapters.insert_one(chapter)
    print(f"✅ Created {len(chapters)} chapters")
    
    # Sample questions for Class 10 - Real Numbers
    class10_realnumbers_id = chapters[0]["chapter_id"]
    
    questions_class10_ch1 = [
        # MCQ Questions
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class10_realnumbers_id,
            "question_type": "MCQ",
            "question_text": "Which of the following is an irrational number?",
            "options": ["√4", "√9", "√2", "√16"],
            "correct_answer": "√2",
            "marks": 1,
            "youtube_solution_url": "",
            "explanation": "√2 is irrational because it cannot be expressed as a ratio of two integers."
        },
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class10_realnumbers_id,
            "question_type": "MCQ",
            "question_text": "The decimal expansion of 22/7 is:",
            "options": ["Terminating", "Non-terminating repeating", "Non-terminating non-repeating", "None of these"],
            "correct_answer": "Non-terminating repeating",
            "marks": 1,
            "youtube_solution_url": "",
            "explanation": "22/7 = 3.142857142857... which is non-terminating but repeating."
        },
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class10_realnumbers_id,
            "question_type": "MCQ",
            "question_text": "The HCF of 96 and 404 is:",
            "options": ["2", "4", "8", "16"],
            "correct_answer": "4",
            "marks": 1,
            "youtube_solution_url": "",
            "explanation": "Using Euclid's division algorithm, HCF(96, 404) = 4"
        },
        # Assertion-Reason Questions
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class10_realnumbers_id,
            "question_type": "Assertion-Reason",
            "question_text": "Assertion (A): The sum of two irrational numbers is always irrational.\nReason (R): √2 + √3 is an irrational number.",
            "options": [
                "Both A and R are true and R is the correct explanation of A",
                "Both A and R are true but R is not the correct explanation of A",
                "A is true but R is false",
                "A is false but R is true"
            ],
            "correct_answer": "A is false but R is true",
            "marks": 1,
            "youtube_solution_url": "",
            "explanation": "The sum of two irrational numbers can be rational (e.g., √2 + (-√2) = 0). However, √2 + √3 is indeed irrational."
        },
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class10_realnumbers_id,
            "question_type": "Assertion-Reason",
            "question_text": "Assertion (A): Every natural number is a whole number.\nReason (R): Whole numbers start from 0.",
            "options": [
                "Both A and R are true and R is the correct explanation of A",
                "Both A and R are true but R is not the correct explanation of A",
                "A is true but R is false",
                "A is false but R is true"
            ],
            "correct_answer": "Both A and R are true but R is not the correct explanation of A",
            "marks": 1,
            "youtube_solution_url": "",
            "explanation": "Natural numbers (1,2,3...) are subset of whole numbers (0,1,2,3...). Both statements are true but R doesn't explain A."
        },
        # 2 Marks Questions
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class10_realnumbers_id,
            "question_type": "2M",
            "question_text": "Use Euclid's division algorithm to find the HCF of 135 and 225.",
            "options": None,
            "correct_answer": "45",
            "marks": 2,
            "youtube_solution_url": "",
            "explanation": "Apply Euclid's division algorithm: 225 = 135 × 1 + 90, 135 = 90 × 1 + 45, 90 = 45 × 2 + 0. Therefore, HCF = 45"
        },
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class10_realnumbers_id,
            "question_type": "2M",
            "question_text": "Show that any positive odd integer is of the form 6q + 1, or 6q + 3, or 6q + 5, where q is some integer.",
            "options": None,
            "correct_answer": "By division algorithm with divisor 6",
            "marks": 2,
            "youtube_solution_url": "",
            "explanation": "By division algorithm, a = 6q + r where 0 ≤ r < 6. For odd numbers, r can be 1, 3, or 5."
        },
        # 3 Marks Questions
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class10_realnumbers_id,
            "question_type": "3M",
            "question_text": "Prove that √3 is irrational.",
            "options": None,
            "correct_answer": "Proof by contradiction",
            "marks": 3,
            "youtube_solution_url": "",
            "explanation": "Assume √3 = p/q (rational), then 3q² = p². This means p is divisible by 3, leading to contradiction."
        },
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class10_realnumbers_id,
            "question_type": "3M",
            "question_text": "Find the LCM and HCF of 6 and 20 by the prime factorization method.",
            "options": None,
            "correct_answer": "HCF = 2, LCM = 60",
            "marks": 3,
            "youtube_solution_url": "",
            "explanation": "6 = 2 × 3, 20 = 2² × 5. HCF = 2, LCM = 2² × 3 × 5 = 60"
        },
        # 5 Marks Questions
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class10_realnumbers_id,
            "question_type": "5M",
            "question_text": "Show that the square of any positive integer cannot be of the form 5q + 2 or 5q + 3 for any integer q.",
            "options": None,
            "correct_answer": "Proof using division algorithm",
            "marks": 5,
            "youtube_solution_url": "",
            "explanation": "Let n be any positive integer. Then n = 5m, 5m+1, 5m+2, 5m+3, or 5m+4. Square each form to show n² can only be 5q or 5q+1 or 5q+4."
        },
    ]
    
    # Sample questions for Class 10 - Polynomials
    class10_polynomials_id = chapters[1]["chapter_id"]
    
    questions_class10_ch2 = [
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class10_polynomials_id,
            "question_type": "MCQ",
            "question_text": "The degree of the polynomial 4x⁴ + 0x³ + 0x² + 5x + 7 is:",
            "options": ["0", "1", "2", "4"],
            "correct_answer": "4",
            "marks": 1,
            "youtube_solution_url": "",
            "explanation": "The highest power of x is 4, so the degree is 4."
        },
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class10_polynomials_id,
            "question_type": "MCQ",
            "question_text": "If one zero of the polynomial 2x² + 3x + k is 1/2, then the value of k is:",
            "options": ["-2", "-1", "0", "2"],
            "correct_answer": "-2",
            "marks": 1,
            "youtube_solution_url": "",
            "explanation": "Substitute x = 1/2: 2(1/4) + 3(1/2) + k = 0, solving gives k = -2"
        },
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class10_polynomials_id,
            "question_type": "Assertion-Reason",
            "question_text": "Assertion (A): The graph of a quadratic polynomial is always a parabola.\nReason (R): A quadratic polynomial has degree 2.",
            "options": [
                "Both A and R are true and R is the correct explanation of A",
                "Both A and R are true but R is not the correct explanation of A",
                "A is true but R is false",
                "A is false but R is true"
            ],
            "correct_answer": "Both A and R are true and R is the correct explanation of A",
            "marks": 1,
            "youtube_solution_url": "",
            "explanation": "A quadratic polynomial (degree 2) always has a parabolic graph. The degree determines the shape."
        },
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class10_polynomials_id,
            "question_type": "2M",
            "question_text": "Find the zeroes of the quadratic polynomial x² + 7x + 10, and verify the relationship between the zeroes and the coefficients.",
            "options": None,
            "correct_answer": "-2 and -5",
            "marks": 2,
            "youtube_solution_url": "",
            "explanation": "x² + 7x + 10 = (x+2)(x+5). Zeroes are -2 and -5. Sum = -7 = -b/a, Product = 10 = c/a"
        },
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class10_polynomials_id,
            "question_type": "3M",
            "question_text": "Divide the polynomial 3x² + x³ + 2x + 5 by x² + 2x + 1 and verify the division algorithm.",
            "options": None,
            "correct_answer": "Quotient: x + 1, Remainder: -2x + 4",
            "marks": 3,
            "youtube_solution_url": "",
            "explanation": "Use polynomial long division method."
        },
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class10_polynomials_id,
            "question_type": "5M",
            "question_text": "If α and β are the zeroes of the polynomial 6x² + x - 2, find the value of α/β + β/α.",
            "options": None,
            "correct_answer": "25/12",
            "marks": 5,
            "youtube_solution_url": "",
            "explanation": "α + β = -1/6, αβ = -2/6 = -1/3. α/β + β/α = (α² + β²)/(αβ) = [(α+β)² - 2αβ]/(αβ)"
        },
    ]
    
    # Sample questions for Class 11 - Sets
    class11_sets_id = chapters[3]["chapter_id"]
    
    questions_class11_ch1 = [
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class11_sets_id,
            "question_type": "MCQ",
            "question_text": "Which of the following is the empty set?",
            "options": ["{0}", "{}", "0", "{ }"],
            "correct_answer": "{}",
            "marks": 1,
            "youtube_solution_url": "",
            "explanation": "Empty set is denoted by {} or ∅, containing no elements."
        },
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class11_sets_id,
            "question_type": "MCQ",
            "question_text": "If A = {1, 2, 3} and B = {2, 3, 4}, then A ∩ B is:",
            "options": ["{1, 2, 3, 4}", "{2, 3}", "{1, 4}", "{1, 2, 3}"],
            "correct_answer": "{2, 3}",
            "marks": 1,
            "youtube_solution_url": "",
            "explanation": "Intersection contains common elements: {2, 3}"
        },
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class11_sets_id,
            "question_type": "Assertion-Reason",
            "question_text": "Assertion (A): If A ⊂ B and B ⊂ C, then A ⊂ C.\nReason (R): The subset relation is transitive.",
            "options": [
                "Both A and R are true and R is the correct explanation of A",
                "Both A and R are true but R is not the correct explanation of A",
                "A is true but R is false",
                "A is false but R is true"
            ],
            "correct_answer": "Both A and R are true and R is the correct explanation of A",
            "marks": 1,
            "youtube_solution_url": "",
            "explanation": "The subset relation is indeed transitive, which directly explains why A ⊂ C."
        },
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class11_sets_id,
            "question_type": "2M",
            "question_text": "If U = {1, 2, 3, 4, 5, 6, 7, 8, 9} and A = {2, 4, 6, 8}, find A'.",
            "options": None,
            "correct_answer": "{1, 3, 5, 7, 9}",
            "marks": 2,
            "youtube_solution_url": "",
            "explanation": "A' (complement of A) contains all elements in U but not in A."
        },
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class11_sets_id,
            "question_type": "3M",
            "question_text": "If A = {x : x is a natural number}, B = {x : x is an even natural number}, C = {x : x is an odd natural number}, and D = {x : x is a prime number}, find (A ∩ B) ∩ (C ∪ D).",
            "options": None,
            "correct_answer": "{2}",
            "marks": 3,
            "youtube_solution_url": "",
            "explanation": "A ∩ B = even natural numbers. C ∪ D = odd numbers union prime numbers. The only even prime is 2."
        },
    ]
    
    # Sample questions for Class 12 - Relations and Functions
    class12_relations_id = chapters[6]["chapter_id"]
    
    questions_class12_ch1 = [
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class12_relations_id,
            "question_type": "MCQ",
            "question_text": "Let R be a relation on the set N of natural numbers defined by R = {(x, y) : y = x + 5, x < 4}. Then R is:",
            "options": ["{(1,6), (2,7), (3,8)}", "{(1,5), (2,6), (3,7)}", "{(1,6), (2,7), (3,8), (4,9)}", "None"],
            "correct_answer": "{(1,6), (2,7), (3,8)}",
            "marks": 1,
            "youtube_solution_url": "",
            "explanation": "For x < 4, x can be 1, 2, 3. Corresponding y values are 6, 7, 8."
        },
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class12_relations_id,
            "question_type": "MCQ",
            "question_text": "The function f: R → R defined by f(x) = 3x + 5 is:",
            "options": ["One-one and onto", "One-one but not onto", "Onto but not one-one", "Neither one-one nor onto"],
            "correct_answer": "One-one and onto",
            "marks": 1,
            "youtube_solution_url": "",
            "explanation": "Linear function with non-zero slope is bijective."
        },
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class12_relations_id,
            "question_type": "3M",
            "question_text": "Show that the function f: N → N given by f(x) = 2x is one-one but not onto.",
            "options": None,
            "correct_answer": "Proof provided",
            "marks": 3,
            "youtube_solution_url": "",
            "explanation": "One-one: If f(x₁) = f(x₂), then 2x₁ = 2x₂, so x₁ = x₂. Not onto: odd numbers are not in range."
        },
        {
            "question_id": str(uuid.uuid4()),
            "chapter_id": class12_relations_id,
            "question_type": "5M",
            "question_text": "Let A = {1, 2, 3, 4} and R be a relation on A defined by R = {(1,2), (2,3), (3,4), (1,3), (2,4), (1,4)}. Check whether R is transitive.",
            "options": None,
            "correct_answer": "Yes, R is transitive",
            "marks": 5,
            "youtube_solution_url": "",
            "explanation": "Check all pairs: (1,2) and (2,3) gives (1,3)✓, (2,3) and (3,4) gives (2,4)✓, etc."
        },
    ]
    
    # Combine all questions
    all_questions = (questions_class10_ch1 + questions_class10_ch2 + 
                     questions_class11_ch1 + questions_class12_ch1)
    
    print("❓ Creating questions...")
    for question in all_questions:
        await db.questions.insert_one(question)
    print(f"✅ Created {len(all_questions)} questions")
    
    print("\n🎉 Database seeding completed successfully!")
    print("\n📋 Summary:")
    print(f"  - Admin Username: admin")
    print(f"  - Admin Password: admin123")
    print(f"  - Student Username: student1")
    print(f"  - Student Password: student123")
    print(f"  - Total Chapters: {len(chapters)}")
    print(f"  - Total Questions: {len(all_questions)}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())

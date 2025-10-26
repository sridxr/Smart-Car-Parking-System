# Smart-Car-Parking-System
This repository contains the source code for an end-to-end intelligent car parking management system. The project uses a Convolutional Neural Network (CNN) to perform real-time, vision-based detection of vacant and occupied parking slots from a camera feed, offering a cost-effective alternative to expensive physical sensors.
Markdown# Smart Car Parking System (CNN & Java)

This repository contains the source code for an end-to-end intelligent car parking management system. This project uses a **Convolutional Neural Network (CNN)** to perform real-time, vision-based detection of vacant and occupied parking slots from a camera feed, offering a cost-effective alternative to expensive physical sensors.

The entire application is built on a unified **Java** stack, integrating the AI model (using **Deeplearning4j**) directly with a full-stack web application (using **Spring Boot** and **MySQL**).

## 🏛️ System Architecture

The system operates by having the detection service analyze a video feed. This service then updates the backend, which manages the database and serves data to the user's web interface via a REST API.

```mermaid
graph TD
    A[CCTV Camera] --> B(CNN Detection Service);
    B -- "Status Update (Vacant/Occupied)" --> C{Spring Boot Backend};
    C -- "Read/Write (JDBC)" --> D[(MySQL Database)];
    E[User's Browser (Frontend)] <-->|"REST API (HTTP/JSON)"| C;
✨ Key FeaturesReal-Time AI Detection: A CNN model built with Deeplearning4j (DL4J) classifies parking slots as "Vacant" or "Occupied."Full-Stack Application: A complete, integrated system from the video feed to the user interface.RESTful API: A secure backend built with Java Spring Boot manages all system logic.User & Reservation System: Users can register, log in, view a real-time visual map of the parking lot, and reserve an available slot.Database Management: All user, slot, and reservation data is stored and managed in a MySQL database.Responsive UI: A simple web interface (HTML/JS/Bootstrap) provides an intuitive experience for users.🛠️ Technology StackBackend: Java 11+ (or 17+), Spring Boot, Spring Security, Spring Data JPA (Hibernate)AI/Detection: Deeplearning4j (DL4J), JavaCV (for video processing)Database: MySQLFrontend: HTML5, CSS3, JavaScript (ES6+), BootstrapBuild/Dependency: MavenPrerequisitesBefore you begin, ensure you have the following installed on your system:Java JDK (Version 11 or 17 is recommended)Apache MavenMySQL Server(Optional) A webcam or a video file (.mp4) to use as the input feed.🚀 Getting StartedFollow these steps to get the project up and running on your local machine.1. Clone the RepositoryBashgit clone [https://github.com/YourUsername/your-repo-name.git](https://github.com/YourUsername/your-repo-name.git)
cd your-repo-name
2. Database SetupOpen your MySQL server/workbench.Create a new database (schema) for the project.SQLCREATE DATABASE smart_parking_db;
Open the application.properties file located in src/main/resources/.Update the database URL, username, and password to match your local MySQL setup.Properties# Example:
spring.datasource.url=jdbc:mysql://localhost:3306/smart_parking_db
spring.datasource.username=your_mysql_username
spring.datasource.password=your_mysql_password

# This will allow Spring Boot to auto-create the tables from your @Entity classes
spring.jpa.hibernate.ddl-auto=update
3. Build the ProjectUse Maven to build the project and download all dependencies.Bashmvn clean install
4. Run the ApplicationYou can run the Spring Boot application using the Maven plugin:Bashmvn spring-boot:run
The application will start, and the backend server will be running (typically on http://localhost:8080).5. Access the ApplicationOpen your web browser and navigate to:http://localhost:8080You should see the web interface, which will be communicating with your backend API.📄 API Endpoints (Examples)The Spring Boot backend provides several RESTful endpoints, including:MethodEndpointDescriptionGET/api/parking/slotsRetrieves the real-time status of all parking slots.POST/api/parking/reserveReserves a specific parking slot for the logged-in user.POST/api/users/registerCreates a new user account.POST/api/auth/loginAuthenticates a user and returns a JWT token.📜 LicenseThis project is licensed under the MIT License - see the LICENSE file for details.

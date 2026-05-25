/**
 * Standalone offline Java RestAssured Test Generator.
 * Used as a structural baseline and fallback.
 */
function generateRestAssured(path, method, scenarios) {
  const className = getClassName(path, method);
  const formattedMethod = method.toUpperCase();
  
  let tests = '';
  
  scenarios.forEach((scenario, index) => {
    const testName = `test_${scenario.type.toLowerCase().replace(/\s+/g, '_')}_${index}`;
    const statusCode = scenario.expectedStatus || 200;
    
    if (formattedMethod === 'GET') {
      tests += `
    @Test
    public void ${testName}() {
        // Description: ${scenario.description}
        given()
            .header("Accept", "application/json")
        .when()
            .get("${path}")
        .then()
            .statusCode(${statusCode});
    }\n`;
    } else {
      // POST, PUT, DELETE
      tests += `
    @Test
    public void ${testName}() {
        // Description: ${scenario.description}
        String requestBody = "{}"; // Define payload according to requirement

        given()
            .header("Content-Type", "application/json")
            .body(requestBody)
        .when()
            .${formattedMethod.toLowerCase()}("${path}")
        .then()
            .statusCode(${statusCode});
    }\n`;
    }
  });

  return `package com.example.api.tests;

import io.restassured.RestAssured;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

/**
 * AI-Generated RestAssured Test Suite for ${formattedMethod} ${path}
 */
public class ${className} {

    @BeforeAll
    public static void setup() {
        RestAssured.baseURI = "https://api.example.com"; // Adjust Base URI
    }
${tests}
}`;
}

function getClassName(path, method) {
  // Turn "/api/v1/users/{id}" into "ApiV1UsersIdGetTest"
  const cleanPath = path
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  
  const cleanMethod = method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
  
  return `${cleanPath}${cleanMethod}Test`;
}

module.exports = {
  generateRestAssured
};

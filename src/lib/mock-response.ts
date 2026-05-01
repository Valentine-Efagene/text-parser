import { type ApiResponse } from "@/components/ResultsPanel";

export const MOCK_RESPONSE: ApiResponse = {
    fileName: "sample-form.jpg",
    mimeType: "image/jpeg",
    rawText: `APPLICATION FORM

Title: Mr
Surname: Okafor
First Name: Adebayo
Middle Name: Chukwuemeka
Email: adebayo.okafor@email.com
Gender: Male
Date of Birth: 14/03/1989
Nationality: Nigerian
State of Origin: Anambra
Phone Number: 08031234567
Home Address: 12 Balogun Street, Ikeja, Lagos

Valid Means of ID: National Identity Card

Employment Type: Full-Time Employment
Name of Employer/Business: Lagos State Civil Service
Years in Employment/Business: 7
Occupation: Administrative Officer
Salary/Monthly Turnover: ₦185,000
Year of Employment: 2018
Grade Level: 08

NEXT OF KIN INFORMATION
Full Name of NOK: Chioma Okafor
Contact of NOK: 08055678901
Address of NOK: 12 Balogun Street, Ikeja, Lagos`,
    parsed: {
        lines: [],
        keyValues: {},
        formFields: [
            { name: "Title", value: "Mr", confidence: 0.99 },
            { name: "Surname", value: "Okafor", confidence: 0.97 },
            { name: "First Name", value: "Adebayo", confidence: 0.97 },
            { name: "Middle Name", value: "Chukwuemeka", confidence: 0.93 },
            { name: "Email", value: "adebayo.okafor@email.com", confidence: 0.95 },
            { name: "Gender", value: "Male", confidence: 0.99 },
            { name: "Date of Birth", value: "14/03/1989", confidence: 0.96 },
            { name: "Nationality", value: "Nigerian", confidence: 0.99 },
            { name: "State of Origin", value: "Anambra", confidence: 0.94 },
            { name: "Phone Number", value: "08031234567", confidence: 0.97 },
            { name: "Home Address", value: "12 Balogun Street, Ikeja, Lagos", confidence: 0.91 },
            { name: "Valid Means of ID", value: "National Identity Card", confidence: 0.95 },
            { name: "Employment Type", value: "Full-Time Employment", confidence: 0.96 },
            { name: "Name of Employer/Business", value: "Lagos State Civil Service", confidence: 0.92 },
            { name: "Years in Employment/Business", value: "7", confidence: 0.98 },
            { name: "Occupation", value: "Administrative Officer", confidence: 0.94 },
            { name: "Salary/Monthly Turnover", value: "₦185,000", confidence: 0.89 },
            { name: "Year of Employment", value: "2018", confidence: 0.97 },
            { name: "Grade Level", value: "08", confidence: 0.96 },
            { name: "Full Name of NOK", value: "Chioma Okafor", confidence: 0.93 },
            { name: "Contact of NOK", value: "08055678901", confidence: 0.95 },
            { name: "Address of NOK", value: "12 Balogun Street, Ikeja, Lagos", confidence: 0.88 },
        ],
        entities: {
            emails: ["adebayo.okafor@email.com"],
            phones: ["08031234567", "08055678901"],
            urls: [],
            dates: ["14/03/1989"],
            amounts: ["₦185,000"],
        },
    },
    meta: {
        charCount: 620,
        lineCount: 26,
        formFieldCount: 22,
    },
};

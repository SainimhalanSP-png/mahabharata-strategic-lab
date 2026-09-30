package com.example.demo.model;

import jakarta.persistence.*;

@Entity
@Table(name = "testing_logs")
public class TestingLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String testId;
    private String testerName;
    private String observation;
    private String status;

    // Default Constructor
    public TestingLog() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTestId() { return testId; }
    public void setTestId(String testId) { this.testId = testId; }

    public String getTesterName() { return testerName; }
    public void setTesterName(String testerName) { this.testerName = testerName; }

    public String getObservation() { return observation; }
    public void setObservation(String observation) { this.observation = observation; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
package com.example.demo.controller;

import com.example.demo.model.TestingLog;
import com.example.demo.repository.TestingLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/logs")
@CrossOrigin(origins = "*") // Allows your frontend to talk to this backend
public class TestingLogController {

    @Autowired
    private TestingLogRepository repository;

    // Get all saved logs
    @GetMapping
    public List<TestingLog> getAllLogs() {
        return repository.findAll();
    }

    // Save or update a test log
    @PostMapping
    public TestingLog saveLog(@RequestBody TestingLog log) {
        return repository.save(log);
    }
}
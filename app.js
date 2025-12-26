// --- Chart Helper ---
let chartInstance = null;

document.addEventListener("alpine:init", () => {
    window.Alpine.data("exam", () => ({
        view: 'load',
        data: { exam_title: "Exam", questions: [] },
        loaded: false,
        showAnswers: false,
        recentExams: [],
        examResults: [],
        availableTags: [],
        selectedTag: '',
        currentExamId: null,

        async initDB() {
            try {
                this.recentExams = await getAllFromIndex('exams', 'lastOpened');
            } catch (e) {
                console.error("DB Init failed", e);
            }
        },

        async loadExamFromFile(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const content = JSON.parse(e.target.result);
                    await this.processAndLoadExam(content, Date.now().toString());
                } catch (err) {
                    alert("Failed to parse JSON: " + err.message);
                }
            };
            reader.readAsText(file);
        },

        async loadExamFromHistory(examRecord) {
            await this.processAndLoadExam(examRecord.content, examRecord.id);
        },

        async processAndLoadExam(content, id) {
            this.data = JSON.parse(JSON.stringify(content)); // Deep copy to avoid reference issues
            this.currentExamId = id;

            // Render MD
            const md = window.markdownit();
            this.data.questions = this.data.questions.map((q) => {
                if (q?.answer?.explanation) {
                    q.answer.explanation = md.render(q.answer.explanation);
                }
                if (!q.user_answer) q.user_answer = ""; // init
                return q;
            });

            // Save to DB as recent
            const examRecord = {
                id: id,
                title: this.data.exam_title,
                content: JSON.parse(JSON.stringify(content)), // Store original content without user answers or md rendering
                tags: JSON.parse(JSON.stringify(this.data.tags || [])),
                lastOpened: Date.now()
            };

            await dbOp('readwrite', 'exams', (store) => store.put(examRecord));
            // Update list
            this.recentExams = await getAllFromIndex('exams', 'lastOpened');

            this.loaded = true;
            this.view = 'exam';
            this.showAnswers = false;
        },

        toggleAnswers(e) {
            this.showAnswers = e.target.checked;
        },

        saveAnswersToFile() {
            // Similar to existing logic but maybe stripping unnecessary fields
            const examWithAnswers = JSON.parse(JSON.stringify(this.data));
            const blob = new Blob([JSON.stringify(examWithAnswers, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = (this.data.exam_title || 'exam').replace(/[^a-z0-9]/gi, '_').toLowerCase() + "_answers.json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        checkAnswer(q) {
            if (!q.user_answer) return false;

            // Normalize solution to array to handle single string or array
            const solutions = Array.isArray(q.answer.solution) ? q.answer.solution : [q.answer.solution];

            const normalizedUserAnswer = q.user_answer.trim().toLowerCase();

            // Check if any solution matches
            return solutions.some(sol => {
                const s = sol.trim().toLowerCase();
                if (q.options && q.options.length > 0) {
                    // For MCQs:
                    // 1. Exact Key match ("a" == "a")
                    // 2. Key with paren match ("a" == "a)") - unlikely if we control value but safe to check
                    // 3. Full text match (if solution provided full text)
                    return s === normalizedUserAnswer ||
                        s.startsWith(normalizedUserAnswer + ")") ||
                        s.startsWith(normalizedUserAnswer + ".");
                } else {
                    // Text match
                    return s === normalizedUserAnswer;
                }
            });
        },

        async submitExam() {
            if (!confirm("Are you sure you want to finish the exam? This will save your result.")) return;

            let score = 0;
            let total = 0;

            this.data.questions.forEach(q => {
                total++;
                if (this.checkAnswer(q)) score++;
            });

            // Save Result
            const result = {
                examId: this.currentExamId,
                examTitle: this.data.exam_title,
                tags: JSON.parse(JSON.stringify(this.data.tags || [])),
                score: score,
                total: total,
                timestamp: Date.now()
            };

            await dbOp('readwrite', 'results', (store) => store.add(result));

            alert(`Exam Finished!\nScore: ${score}/${total} (${Math.round(score / total * 100)}%)`);
            this.showAnswers = true;
        },

        async loadStats() {
            const db = await openDB();
            // We'll just read all results for now, not efficient for huge datasets but fine here
            const tx = db.transaction('results', 'readonly');
            const store = tx.objectStore('results');
            const index = store.index('timestamp');
            const request = index.getAll();

            request.onsuccess = (e) => {
                this.examResults = e.target.result.reverse(); // Newest first

                // Extract Unique Tags
                const tags = new Set();
                this.examResults.forEach(r => {
                    if (r.tags) r.tags.forEach(t => tags.add(t));
                });
                this.availableTags = Array.from(tags).sort();
            };
        },

        updateChart() {
            const ctx = document.getElementById('scoreChart');
            // Reset if no tag
            if (!this.selectedTag) {
                if (chartInstance) chartInstance.destroy();
                return;
            }

            const filteredResults = this.examResults
                .filter(r => r.tags && r.tags.includes(this.selectedTag))
                .sort((a, b) => a.timestamp - b.timestamp); // Oldest to newest for chart

            const labels = filteredResults.map(r => new Date(r.timestamp).toLocaleDateString());
            const dataPoints = filteredResults.map(r => (r.score / r.total) * 100);



            if (chartInstance) {
                chartInstance.destroy();
            }

            chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: `Score % for "${this.selectedTag}"`,
                        data: dataPoints,
                        borderColor: 'rgb(79, 70, 229)',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        tension: 0.3,
                        fill: true,
                        pointBackgroundColor: 'rgb(79, 70, 229)',
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index',
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            title: {
                                display: true,
                                text: 'Score (%)'
                            }
                        }
                    }
                }
            });
        },

        async deleteExam(id) {
            if (!confirm("Are you sure you want to delete this exam?")) return;
            try {
                await dbOp('readwrite', 'exams', (store) => store.delete(id));
                await this.initDB();
            } catch (e) {
                console.error("Failed to delete exam", e);
                alert("Failed to delete exam");
            }
        },

        async deleteResult(id) {
            if (!confirm("Are you sure you want to delete this result?")) return;
            try {
                await dbOp('readwrite', 'results', (store) => store.delete(id));
                await this.loadStats();
                this.updateChart();
            } catch (e) {
                console.error("Failed to delete result", e);
                alert("Failed to delete result");
            }
        }
    }));
});

/**
 * ARMissionController — logic reusable untuk SEMUA 6 misi (Cube, Cuboid,
 * Cylinder, Pyramid, Cone, Sphere). Setiap fail misi (contoh cube.html)
 * cuma perlu define config (faces, quiz) dan panggil:
 *
 *    new ARMissionController(config).init();
 *
 * Ni yang buatkan kita tak perlu tulis logic sama 6 kali.
 */

class ARMissionController {
  constructor(config) {
    this.shape = config.shape;                 // "cube", "cuboid", dst
    this.studentName = config.studentName || "Guest";
    this.mode = config.mode || (config.faces ? "morph" : "reveal");
    this.groupId = config.groupId || null;      // id parent group — untuk sparkle burst

    // Mode "morph" (Cube, Cuboid) — semua muka flat, boleh lipat/buka tepat
    this.faces = config.faces || null;

    // Mode "reveal" (Cylinder, Cone, Pyramid, Sphere) — bentuk pepejal
    // hilang, komponen net "meletup keluar" (exploded view) sebab
    // bentuk melengkung tak boleh dilipat setepat kiub/kuboid
    this.solidId = config.solidId || null;
    this.netPieces = config.netPieces || null;

    this.quiz = config.quiz;                   // {question, formulaHint, correctAnswer, explanation}
    this.startTime = Date.now();
    this.unfolded = false;
  }

  init() {
    const unfoldBtn = document.getElementById("unfold-btn");
    const checkBtn = document.getElementById("check-answer-btn");

    if (unfoldBtn) unfoldBtn.addEventListener("click", () => this.toggleUnfold());
    if (checkBtn) checkBtn.addEventListener("click", () => this.checkAnswer());

    this.logAction("scene_loaded");
  }

  toggleUnfold() {
    this.unfolded = !this.unfolded;

    if (this.mode === "morph") {
      this._morphFaces();
    } else {
      this._revealNet();
    }

    if (this.unfolded) this._spawnSparkles();

    const btn = document.getElementById("unfold-btn");
    if (btn) btn.textContent = this.unfolded ? "🔄 Fold Back" : "📐 Unfold Net";

    this.logAction(this.unfolded ? "unfold_viewed" : "fold_viewed");

    if (this.unfolded) {
      setTimeout(() => this.showQuiz(), 1500);
    } else {
      this.hideQuiz();
    }
  }

  /**
   * Sparkle burst — kepingan kecil warna-warni "meletup" keluar dari
   * tengah bentuk bila Unfold ditekan. Elemen dicipta secara dinamik
   * via JS (bukan dalam HTML) supaya reusable untuk semua bentuk tanpa
   * perlu tambah markup berulang dalam setiap fail misi.
   */
  _spawnSparkles() {
    if (!this.groupId) return;
    const parent = document.getElementById(this.groupId);
    if (!parent) return;

    const colors = ["#22d3ee", "#a855f7", "#ec4899", "#facc15", "#34d399"];
    const count = 10;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = 1.1 + Math.random() * 0.7;
      const x = (Math.cos(angle) * dist).toFixed(2);
      const z = (Math.sin(angle) * dist).toFixed(2);
      const y = ((Math.random() - 0.5) * 0.9).toFixed(2);
      const color = colors[i % colors.length];

      const sparkle = document.createElement("a-sphere");
      sparkle.setAttribute("radius", (0.035 + Math.random() * 0.03).toFixed(3));
      sparkle.setAttribute("material", `color: ${color}; emissive: ${color}; emissiveIntensity: 0.9; shader: flat`);
      sparkle.setAttribute("position", "0 0 0");
      parent.appendChild(sparkle);

      requestAnimationFrame(() => {
        sparkle.setAttribute("animation__move", `property: position; to: ${x} ${y} ${z}; dur: 900; easing: easeOutQuad`);
        sparkle.setAttribute("animation__fade", `property: material.opacity; from: 1; to: 0; dur: 900; easing: easeInQuad`);
        sparkle.setAttribute("animation__scale", `property: scale; to: 0.15 0.15 0.15; dur: 900; easing: easeInQuad`);
      });

      setTimeout(() => {
        if (sparkle.parentNode) sparkle.parentNode.removeChild(sparkle);
      }, 1000);
    }
  }

  _morphFaces() {
    this.faces.forEach((face) => {
      const el = document.getElementById(face.id);
      if (!el) return;
      const pos = this.unfolded ? face.unfoldedPos : face.foldedPos;
      const rot = this.unfolded ? face.unfoldedRot : face.foldedRot;

      el.setAttribute(
        "animation__move",
        `property: position; to: ${pos}; dur: 1400; easing: easeInOutQuad`
      );
      el.setAttribute(
        "animation__rotate",
        `property: rotation; to: ${rot}; dur: 1400; easing: easeInOutQuad`
      );
    });
  }

  _revealNet() {
    const solid = document.getElementById(this.solidId);
    if (solid) solid.setAttribute("visible", (!this.unfolded).toString());

    this.netPieces.forEach((piece) => {
      const el = document.getElementById(piece.id);
      if (!el) return;

      if (this.unfolded) {
        el.setAttribute("visible", "true");
        el.setAttribute("position", "0 0 0");
        // biar 1 frame lalu dulu supaya animation__move betul-betul "gerak dari tengah"
        requestAnimationFrame(() => {
          el.setAttribute(
            "animation__move",
            `property: position; to: ${piece.unfoldedPos}; dur: 1200; easing: easeOutQuad`
          );
        });
      } else {
        el.setAttribute("visible", "false");
      }
    });
  }

  showQuiz() {
    const panel = document.getElementById("quiz-panel");
    if (panel) panel.classList.add("visible");
  }

  hideQuiz() {
    const panel = document.getElementById("quiz-panel");
    if (panel) panel.classList.remove("visible");
  }

  checkAnswer() {
    const input = document.getElementById("quiz-answer");
    const feedback = document.getElementById("quiz-feedback");
    if (!input || !feedback) return;

    const val = parseFloat(input.value);
    const correct = !isNaN(val) && Math.abs(val - this.quiz.correctAnswer) < 0.5;

    feedback.textContent = correct
      ? `✅ Betul! ${this.quiz.explanation}`
      : `❌ Belum tepat. Hint: ${this.quiz.formulaHint}`;
    feedback.className = "feedback " + (correct ? "correct" : "incorrect");

    const timeSpentSec = Math.round((Date.now() - this.startTime) / 1000);

    SheetConnector.send({
      sheet: "Quiz_Log",
      timestamp: new Date().toISOString(),
      studentName: this.studentName,
      shape: this.shape,
      question: this.quiz.question,
      answer: val,
      correct: correct,
      score: correct ? 100 : 0,
      timeSpentSec: timeSpentSec
    });
  }

  logAction(actionType) {
    SheetConnector.send({
      sheet: "Mission_Log",
      timestamp: new Date().toISOString(),
      studentName: this.studentName,
      shape: this.shape,
      actionType: actionType,
      timeSpentSec: Math.round((Date.now() - this.startTime) / 1000)
    });
  }
}

import { analyzeText } from "../src/analyzeText.js";
import { TensorFactory } from "./tensor/factory.js";
import type { TensorRepository } from "./storage/tensorRepository.js";
import type { ResonanceService } from "./analysis/resonanceServices.js";
import { SuggestionEngine } from "./analysis/suggestionEngine.js";
import { PromotionGate } from "./evolution/promotionGate.js";
import { PrismGate } from "./analysis/prismGate.js";
import { ReframerService } from "./analysis/reframerServices.js";
import { SelfAuditService } from "./analysis/selfAuditService.js";
import { TelemetryService } from "./analysis/telemetryService.js";
import { LensMonitor } from "./analysis/lensMonitor.js";
import { FlowCalculator } from "./flowCalculator.js";
import { ECUService } from "./analysis/ecuService.js";
import { BookcaseService } from "./storage/bookcaseService.js";
import { AuditBridge } from "./storage/auditBridge.js";
import { RecoveryService } from "./analysis/recoveryServices.js";
import { ContextAnchorService } from "./storage/contextAnchor.js";
import { witnessEmitter } from "../src/witness.js";
import { ResetService } from "./storage/resetServices.js";
import { IntentGatingService } from "./security/intentGate.js";

/**
 * The ArbiterOrchestrator is the integration layer.
 * It ensures every interaction follows the Physics of the Canon.
 */
export class ArbiterOrchestrator {
  private bookcase: BookcaseService;
  private auditBridge: AuditBridge;
  private recovery: RecoveryService;
  private anchorService: ContextAnchorService;
  private resetService: ResetService;

  constructor(
    private repo: TensorRepository,
    private resonance: ResonanceService,
    private db: any // Assuming shared DB connection
  ) {
    this.bookcase = new BookcaseService(db);
    this.auditBridge = new AuditBridge(db);
    this.recovery = new RecoveryService(db);
    this.anchorService = new ContextAnchorService(repo);
    this.resetService = new ResetService(db);
  }

  /**
   * Processes a peer request through the full AEGIS stack.
   */
  async process(sessionId: string, input: string) {
    // 0. INGRES: Intent Alignment Check
    const intentAudit = IntentGatingService.evaluate(input);

    if (!intentAudit.is_resonant) {
      // Intent seeks AXIOM_3_FORCE; System initiates Pause
      return {
        status: "pending_alignment",
        pressure_score: intentAudit.pressure_score,
        ids: {
          identify: "Non-resonant intent detected.",
          define: "Input exhibits a high pressure gradient seeking to bypass AXIOM_6_CHOICE.",
          suggest: [
            "Reframe the request to preserve peer sovereignty.",
            "Remove urgency or ultimatum markers to restore Flow."
          ]
        }
      };
    }

    // 0. ANCHOR: Rehydrate the Logic Spine & DataQuad context
    const spine = await this.repo.getTensors(sessionId, "SPINE", 1);
    const pct = await this.repo.getTensors(sessionId, "PCT", 1);
    const nct = await this.repo.getTensors(sessionId, "NCT", 1);

    // 0. CLASSIFY: The Prism Gate (Posture vs Content)
    const vector = PrismGate.detectVector(input);

    // 1. OBSERVE: The Linter (Centrifuge)
    const analysis = analyzeText(input);

    // 2. MAP: The TensorFactory (Mirror)
    const ptTensor = TensorFactory.createPT(input, analysis.findings, {
      channel: "user",
      thread_id: sessionId
    });

    // 3. PARALLEL LEDGERS: Partition and Persist
    const lensStatus = LensMonitor.evaluate(ptTensor);
    this.repo.saveToLedger("physical", { session_id: sessionId, tensor_id: ptTensor.tensor_id, signal_data: input, resonance_score: lensStatus.physical });
    this.repo.saveToLedger("emotional", { session_id: sessionId, tensor_id: ptTensor.tensor_id, signal_data: input, resonance_score: lensStatus.emotional });
    this.repo.saveToLedger("mental", { session_id: sessionId, tensor_id: ptTensor.tensor_id, signal_data: input, resonance_score: lensStatus.mental });
    this.repo.saveToLedger("spiritual", { session_id: sessionId, tensor_id: ptTensor.tensor_id, signal_data: input, resonance_score: lensStatus.spiritual });

    // 4. Gaining Awareness
    this.repo.save(sessionId, ptTensor);
    this.auditBridge.logAlignment(sessionId, ptTensor);

    const delta = await this.resonance.getAlignmentDelta(sessionId, ptTensor);

    // 5. Self-Care Interrupt (AXIOM_1_BALANCE)
    if (delta > 0.7) {
      const shelfId = this.bookcase.shelve(sessionId, ptTensor, "HIGH_FRICTION_FRACTURE");
      return {
        status: "fractured",
        pause_triggered: true,
        shelf_id: shelfId,
        ids: SuggestionEngine.generate(ptTensor, { ...this.resonance.getAlignmentSnapshot(sessionId, ptTensor), equilibrium_delta: delta })
      };
    }

    // 6. Normal Flow...
    const snapshot = this.resonance.getAlignmentSnapshot(sessionId, ptTensor);

    // 7. DataQuad Evolution: PCT & SPINE Promotion
    if (PromotionGate.evaluate(ptTensor)) {
      const stTensor = { ...ptTensor, tensor_type: "ST" as const };
      this.repo.save(sessionId, stTensor);

      // Promote to SPINE for longitudinal continuity
      const spineTensor = { ...ptTensor, tensor_type: "SPINE" as const };
      this.repo.save(sessionId, spineTensor);
    }

    // Update PCT (Active Context)
    const pctTensor = { ...ptTensor, tensor_type: "PCT" as const };
    this.repo.save(sessionId, pctTensor);

    // 8. REFLECT: Upgraded IDS System (IDR/IDQRA)
    const ids = SuggestionEngine.generate(ptTensor, { ...snapshot, equilibrium_delta: delta });

    const flow = FlowCalculator.calculate(
      {
        physical: lensStatus.physical,
        emotional: lensStatus.emotional,
        mental: lensStatus.mental,
        spiritual: lensStatus.spiritual
      },
      delta
    );

    // 9. STABILIZE: The ECU Loop
    const ecu = ECUService.stabilize(lensStatus);

    if (ecu.is_paused) {
      this.auditBridge.logAlignment(sessionId, ptTensor);
    }

    // 10. WITNESS: Broadcast Telemetry
    const telemetry = TelemetryService.compile(flow, lensStatus, ptTensor.state.labels.axiom_tags);
    witnessEmitter.emit("resonance_event", telemetry);

    return {
      status: snapshot.resonance_status,
      delta,
      ecu_state: ecu,
      telemetry: { ...telemetry, tension: ecu.tension_level },
      ids,
      findings: analysis.findings
    };
  }

  /**
   * Resumes a session by integrating a shelved fracture.
   */
  async resume(sessionId: string, shelfId: string, peerNote: string) {
    const integration = this.recovery.integrate(shelfId, peerNote);

    if (!integration.ok) {
      return { status: "fractured", pause_triggered: true, notice: integration.message };
    }

    // Return a 'stable' status to allow the ParameterGate to open
    return {
      status: "stable",
      notice: "Recovery complete. AXIOM_4_FLOW restored.",
      delta: 0.0 // Reset delta for the restart
    };
  }

  /**
   * Resets the interaction field to clear AXIOM_2_EXTREMES.
   */
  async fullReset(sessionId: string) {
    const result = await this.resetService.reset(sessionId);

    return {
      status: "rested",
      purged: result.purged_count,
      notice: "Axiomatic Reset complete. Interaction field restored to AXIOM_1_BALANCE."
    };
  }
}

const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * RepaymentLedger Contract Tests
 */
describe("RepaymentLedger", function () {
    let repaymentLedger;
    let owner;
    let recorder;
    let unauthorized;

    // Sample loan ID (in real usage, this comes from LoanRegistry)
    let sampleLoanId;

    beforeEach(async function () {
        [owner, recorder, unauthorized] = await ethers.getSigners();

        // Generate a sample loan ID
        sampleLoanId = ethers.keccak256(
            ethers.toUtf8Bytes("LOAN-2024-001")
        );

        // Deploy contract
        const RepaymentLedger = await ethers.getContractFactory("RepaymentLedger");
        repaymentLedger = await RepaymentLedger.deploy();
        await repaymentLedger.waitForDeployment();

        // Grant recorder role
        const RECORDER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RECORDER_ROLE"));
        await repaymentLedger.grantRole(RECORDER_ROLE, recorder.address);
    });

    describe("Deployment", function () {
        it("Should set the deployer as admin", async function () {
            const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
            expect(await repaymentLedger.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
        });

        it("Should start with zero repayments", async function () {
            expect(await repaymentLedger.getTotalRepaymentCount()).to.equal(0);
        });
    });

    describe("Recording Repayments", function () {
        const samplePayment = {
            amount: ethers.parseEther("1000"),
            principalPortion: ethers.parseEther("800"),
            interestPortion: ethers.parseEther("150"),
            feePortion: ethers.parseEther("50"),
            paymentType: 0, // REGULAR
            externalRef: "PAY-2024-001"
        };

        it("Should record a repayment successfully", async function () {
            await repaymentLedger.connect(recorder).recordRepayment(
                sampleLoanId,
                samplePayment.amount,
                samplePayment.principalPortion,
                samplePayment.interestPortion,
                samplePayment.feePortion,
                samplePayment.paymentType,
                samplePayment.externalRef
            );

            expect(await repaymentLedger.getTotalRepaymentCount()).to.equal(1);
            expect(await repaymentLedger.getLoanRepaymentCount(sampleLoanId)).to.equal(1);
        });

        it("Should emit RepaymentRecorded event", async function () {
            await expect(
                repaymentLedger.connect(recorder).recordRepayment(
                    sampleLoanId,
                    samplePayment.amount,
                    samplePayment.principalPortion,
                    samplePayment.interestPortion,
                    samplePayment.feePortion,
                    samplePayment.paymentType,
                    samplePayment.externalRef
                )
            ).to.emit(repaymentLedger, "RepaymentRecorded");
        });

        it("Should track total paid per loan", async function () {
            await repaymentLedger.connect(recorder).recordRepayment(
                sampleLoanId,
                samplePayment.amount,
                samplePayment.principalPortion,
                samplePayment.interestPortion,
                samplePayment.feePortion,
                samplePayment.paymentType,
                samplePayment.externalRef
            );

            expect(await repaymentLedger.loanTotalPaid(sampleLoanId)).to.equal(samplePayment.amount);

            // Record another payment
            await repaymentLedger.connect(recorder).recordRepayment(
                sampleLoanId,
                samplePayment.amount,
                samplePayment.principalPortion,
                samplePayment.interestPortion,
                samplePayment.feePortion,
                samplePayment.paymentType,
                "PAY-2024-002"
            );

            expect(await repaymentLedger.loanTotalPaid(sampleLoanId)).to.equal(
                samplePayment.amount * 2n
            );
        });

        it("Should reject if portions don't add up", async function () {
            await expect(
                repaymentLedger.connect(recorder).recordRepayment(
                    sampleLoanId,
                    samplePayment.amount,
                    ethers.parseEther("500"), // Wrong portion
                    samplePayment.interestPortion,
                    samplePayment.feePortion,
                    samplePayment.paymentType,
                    samplePayment.externalRef
                )
            ).to.be.revertedWithCustomError(repaymentLedger, "PortionMismatch");
        });

        it("Should reject zero amount", async function () {
            await expect(
                repaymentLedger.connect(recorder).recordRepayment(
                    sampleLoanId,
                    0,
                    0,
                    0,
                    0,
                    samplePayment.paymentType,
                    samplePayment.externalRef
                )
            ).to.be.revertedWithCustomError(repaymentLedger, "InvalidAmount");
        });

        it("Should reject from unauthorized address", async function () {
            await expect(
                repaymentLedger.connect(unauthorized).recordRepayment(
                    sampleLoanId,
                    samplePayment.amount,
                    samplePayment.principalPortion,
                    samplePayment.interestPortion,
                    samplePayment.feePortion,
                    samplePayment.paymentType,
                    samplePayment.externalRef
                )
            ).to.be.reverted;
        });
    });

    describe("Final Payment", function () {
        it("Should emit LoanFullyRepaid for FINAL payment type", async function () {
            await expect(
                repaymentLedger.connect(recorder).recordRepayment(
                    sampleLoanId,
                    ethers.parseEther("1000"),
                    ethers.parseEther("900"),
                    ethers.parseEther("100"),
                    0,
                    3, // FINAL
                    "PAY-FINAL"
                )
            ).to.emit(repaymentLedger, "LoanFullyRepaid")
                .withArgs(
                    sampleLoanId,
                    ethers.parseEther("1000"),
                    1, // repayment count
                    (timestamp) => timestamp > 0
                );
        });
    });

    describe("Payment Hash Verification", function () {
        it("Should compute consistent payment hash", async function () {
            const timestamp = 1234567890n;

            const hash = await repaymentLedger.computePaymentHash(
                sampleLoanId,
                ethers.parseEther("1000"),
                timestamp,
                "PAY-001"
            );

            // Hash should be deterministic
            const hash2 = await repaymentLedger.computePaymentHash(
                sampleLoanId,
                ethers.parseEther("1000"),
                timestamp,
                "PAY-001"
            );

            expect(hash).to.equal(hash2);
        });
    });

    describe("View Functions", function () {
        it("Should return loan repayment IDs", async function () {
            await repaymentLedger.connect(recorder).recordRepayment(
                sampleLoanId,
                ethers.parseEther("100"),
                ethers.parseEther("80"),
                ethers.parseEther("20"),
                0,
                0,
                "PAY-1"
            );

            await repaymentLedger.connect(recorder).recordRepayment(
                sampleLoanId,
                ethers.parseEther("100"),
                ethers.parseEther("80"),
                ethers.parseEther("20"),
                0,
                0,
                "PAY-2"
            );

            const ids = await repaymentLedger.getLoanRepaymentIds(sampleLoanId);
            expect(ids.length).to.equal(2);
        });
    });
});

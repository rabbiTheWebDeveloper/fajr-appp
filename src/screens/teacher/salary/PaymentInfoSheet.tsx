import React, { useState } from "react";

import { api, errorMessage } from "@/api/client";
import { successFeedback } from "@/lib/device";
import {
  BANK_ACCOUNT_TYPE_OPTIONS,
  DEFAULT_BANK,
  MAX_PAYMENT_UPDATES,
  METHOD_OPTIONS,
  MFS_ACCOUNT_TYPE_OPTIONS,
  PROVIDER_OPTIONS,
  accountNumberLabel,
  applyMethodChange,
  applyProviderChange,
  isMobileWallet,
  isOtherBank,
  paymentPayload,
  paymentWindowStatus,
  type PaymentForm,
  type SavedPaymentInfo,
} from "@/screens/teacher/salary/payment-info";
import { CompletionBar } from "@/screens/teacher/salary/parts";
import { Badge, Banner, Button, Input, Select, Sheet, T } from "@/ui";

interface PaymentInfoSheetProps {
  visible: boolean;
  onClose: () => void;
  /** The saved details the form starts from */
  initial: PaymentForm;
  updateCount: number;
  /** Called with the saved form and the server's new update count (undefined when it sent none) */
  onSaved: (form: PaymentForm, updateCount: number | undefined) => void;
}

type FieldErrors = Partial<Record<"customBankName" | "accountName" | "accountNumber" | "branchName" | "routingNumber", string>>;

const REQUIRED = "Please fill out this field.";

/** The payout account form: bank or mobile wallet details the salary is sent to */
export default function PaymentInfoSheet(props: PaymentInfoSheetProps) {
  // Mounted only while open, so each opening starts from the saved details
  if (!props.visible) return null;
  return <PaymentInfoForm {...props} />;
}

function PaymentInfoForm({ onClose, initial, updateCount, onSaved }: PaymentInfoSheetProps) {
  const [form, setForm] = useState<PaymentForm>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const set = (patch: Partial<PaymentForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setErrors({});
    setMessage("");
  };

  const wallet = isMobileWallet(form.method);
  const otherBank = isOtherBank(form);
  const defaultBank = form.method === "Bank_Transfer" && form.bankName === DEFAULT_BANK;

  const handleSave = async () => {
    // The window can close, and the limit can be reached, while the form is open
    if (!paymentWindowStatus().isOpen) {
      setMessage("পেমেন্ট তথ্য শুধুমাত্র প্রতি মাসের ১৫ থেকে ০২ তারিখ রাত ১১:৫৯ পর্যন্ত আপডেট করা যাবে। (Payment info updates are only allowed from the 15th to 2nd 11:59 PM of each month).");
      return;
    }
    if (updateCount >= MAX_PAYMENT_UPDATES) {
      setMessage("Maximum update limit reached. You can only update payment information up to 4 times.");
      return;
    }

    const found: FieldErrors = {};
    if (form.bankName === "Other" && !form.customBankName.trim()) found.customBankName = REQUIRED;
    if (!form.accountName.trim()) found.accountName = REQUIRED;
    if (!form.accountNumber.trim()) found.accountNumber = REQUIRED;
    if (otherBank && !form.branchName.trim()) found.branchName = REQUIRED;
    if (otherBank && !form.routingNumber.trim()) found.routingNumber = REQUIRED;
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const data = await api.put<{ success?: boolean; message?: string; teacher?: { paymentInfo?: SavedPaymentInfo } }>("/api/teacher-portal/profile", { paymentInfo: paymentPayload(form) });
      if (!data.success) {
        setMessage(data.message || "Failed to save payment info");
        return;
      }
      successFeedback();
      onSaved(form, data.teacher?.paymentInfo?.updateCount);
      onClose();
    } catch (err) {
      setMessage(errorMessage(err, "Network error occurred"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible
      full
      onClose={saving ? () => {} : onClose}
      title="Payment Information"
      footer={
        <>
          {message ? <Banner tone="danger" message={message} /> : null}
          <Button title={saving ? "সংরক্ষণ করা হচ্ছে..." : "Save Payment Info"} icon="save" loading={saving} block onPress={() => void handleSave()} />
        </>
      }
    >
      <Banner
        tone="warning"
        icon="alert-circle"
        title="সতর্কবার্তা ও বিশেষ নির্দেশাবলী (Disclaimer & Notice)"
        message="অনুগ্রহ করে তথ্য জমা দেওয়ার পূর্বে আপনার পেমেন্ট সংক্রান্ত সকল তথ্য (অ্যাকাউন্ট নাম, অ্যাকাউন্ট নম্বর ইত্যাদি) সঠিকভাবে দেখে নিশ্চিত করুন।"
      >
        <T variant="small" color="warning" style={{ lineHeight: 19 }}>
          📅 সময়সূচি:{" "}
          <T variant="smallStrong" color="warning">
            প্রতি মাসের ১৫ থেকে ০২ তারিখ রাত ১১:৫৯
          </T>{" "}
          পর্যন্ত উন্মুক্ত | ⚠️ সর্বোচ্চ{" "}
          <T variant="smallStrong" color="danger" style={{ textDecorationLine: "underline" }}>
            ৪ বার
          </T>{" "}
          আপডেট সম্ভব
        </T>
        <Badge label={`পরিবর্তন করা হয়েছে: ${updateCount} / ৪`} tone="warning" style={{ marginTop: 8 }} />
      </Banner>

      <CompletionBar form={form} />

      <Select label="Payment Method" required value={form.method} options={METHOD_OPTIONS} onChange={(method) => set(applyMethodChange(form, method))} />

      <Select label="Bank / Provider Name" required value={form.bankName || DEFAULT_BANK} options={PROVIDER_OPTIONS} onChange={(provider) => set(applyProviderChange(form, provider))} searchable />

      {form.bankName === "Other" ? (
        <Input
          label="Specify Bank / Provider Name"
          required
          value={form.customBankName}
          onChangeText={(customBankName) => set({ customBankName })}
          placeholder="Enter Bank or Provider Name"
          error={errors.customBankName}
        />
      ) : null}

      <Input
        label="Account Holder Name"
        required
        value={form.accountName}
        onChangeText={(accountName) => set({ accountName })}
        placeholder={form.method === "bKash" || form.method === "Nagad" ? "Name registered with account" : "Account Holder Name"}
        autoCapitalize="words"
        error={errors.accountName}
      />

      <Input
        label={accountNumberLabel(form.method)}
        required
        value={form.accountNumber}
        onChangeText={(accountNumber) => set({ accountNumber })}
        placeholder={wallet ? "017XXXXXXXX / 018XXXXXXXX" : "Bank Account Number"}
        keyboardType={wallet ? "phone-pad" : "default"}
        autoCapitalize="none"
        autoCorrect={false}
        error={errors.accountNumber}
      />

      {/* Other banks: account type, branch and routing number are all needed */}
      {otherBank ? (
        <>
          <Select label="Account Type (হিসাবের ধরন)" required value={form.accountType || "Savings"} options={BANK_ACCOUNT_TYPE_OPTIONS} onChange={(accountType) => set({ accountType })} />
          <Input
            label="Branch Name (শাখার নাম)"
            required
            value={form.branchName}
            onChangeText={(branchName) => set({ branchName })}
            placeholder="e.g. Dhanmondi Branch, Motijheel"
            error={errors.branchName}
          />
          <Input
            label="Routing Number (রাউটিং নম্বর)"
            required
            value={form.routingNumber}
            onChangeText={(routingNumber) => set({ routingNumber })}
            placeholder="9-digit Bank Routing Number"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.routingNumber}
          />
        </>
      ) : null}

      {/* The default bank only asks for routing or branch details as an extra */}
      {defaultBank ? (
        <Input
          label="Routing Number / Branch (Optional)"
          value={form.routingNumber}
          onChangeText={(routingNumber) => set({ routingNumber })}
          placeholder="Optional routing or branch info"
          autoCapitalize="none"
          autoCorrect={false}
        />
      ) : null}

      {wallet ? <Select label="Account Type (অ্যাকাউন্ট টাইপ)" value={form.accountType || "Personal"} options={MFS_ACCOUNT_TYPE_OPTIONS} onChange={(accountType) => set({ accountType })} /> : null}
    </Sheet>
  );
}

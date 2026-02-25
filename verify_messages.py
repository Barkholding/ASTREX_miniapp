import messages

def analyze_regular():
    ru = messages.MESSAGES['ru']
    en = messages.MESSAGES['en']
    ka = messages.MESSAGES['ka']
    
    print(f"Counts - RU: {len(ru)}, EN: {len(en)}, KA: {len(ka)}")
    
    # We assuming RU is the source
    for i in range(max(len(ru), len(en), len(ka))):
        r = ru[i] if i < len(ru) else "MISSING"
        e = en[i] if i < len(en) else "MISSING"
        k = ka[i] if i < len(ka) else "MISSING"
        
        if e == "MISSING" or k == "MISSING":
            print(f"Index {i} mismatch:")
            print(f"  RU: {r[:50]}...")
            print(f"  EN: {e[:50]}...")
            print(f"  KA: {k[:50]}...")

def analyze_premium():
    ru = messages.PREMIUM_MESSAGES['ru']
    en = messages.PREMIUM_MESSAGES['en']
    ka = messages.PREMIUM_MESSAGES['ka']
    
    print(f"\nPremium Counts - RU: {len(ru)}, EN: {len(en)}, KA: {len(ka)}")
    
    for i in range(max(len(ru), len(en), len(ka))):
        r = ru[i]['text'] if i < len(ru) else "MISSING"
        e = en[i]['text'] if i < len(en) else "MISSING"
        k = ka[i]['text'] if i < len(ka) else "MISSING"
        
        # Simple heuristic check for alignment: if first 10 chars of RU don't seem to correlate with EN?
        # That's hard. Let's just print gaps.
        if r == "MISSING" or e == "MISSING" or k == "MISSING":
             print(f"Index {i} missing translation:")
             print(f"  RU: {r[:50]}...")
             print(f"  EN: {e[:50]}...")
             print(f"  KA: {k[:50]}...")

if __name__ == "__main__":
    analyze_regular()
    analyze_premium()

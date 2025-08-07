package org.springframework.samples.petclinic.vet

import java.util.ArrayList
import java.util.List
import jakarta.xml.bind.annotation.XmlElement
import jakarta.xml bind.annotation.XmlRootElement // This might be a typo — the Java code has two separate annotations: @XmlRootElement and then inside.

open class Vets {
    private var vets: MutableList<Vet>? = null

    @XmlElement
    fun getVetList(): List<<? extends Vet>>? { 
        if (vets == null) {
            vets = ArrayList()
        }
        return vets // This is not safe because we don't know the type of Vet, but it's a conversion from Java so we keep as is.
    }

}